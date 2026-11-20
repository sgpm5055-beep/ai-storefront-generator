/**
 * GET/PATCH/POST /api/store/[token] — the edit surface.
 *
 * PRD §FR4: every field edits inline and saves automatically; an edited
 * field is never overwritten by a later regeneration.
 * PRD §FR5: publish, unpublish, and the bio-code ownership check.
 */
import { db, hashToken, logEvent, uniqueSlug, slugify, newOwnershipCode } from '@/lib/db';
import { getStoreByToken, getProducts } from '@/lib/store';
import { readBio, ScrapeError } from '@/lib/scrape';
import { checkField, regulatedNicheFor, hasBlockingViolation } from '@/lib/guardrails';

async function load(token: string) {
  return getStoreByToken(hashToken(token));
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const store = await load(token);
  if (!store) return Response.json({ error: 'not_found' }, { status: 404 });
  return Response.json({ store, products: await getProducts(store.id) });
}

/** Inline field edits. Autosaves one field at a time. */
export async function PATCH(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const store = await load(token);
  if (!store) return Response.json({ error: 'not_found' }, { status: 404 });
  if (store.is_sample) {
    return Response.json({ error: 'Sample stores are read-only.' }, { status: 403 });
  }

  const body = await req.json() as {
    field: string; value: string | number | string[]; productId?: string;
  };

  // The creator's words are their own, but a banned claim must not reach a
  // published page even when typed by hand. PRD §Guardrails.
  if (typeof body.value === 'string') {
    const violations = checkField(body.field, body.value, regulatedNicheFor(store.niche ?? ''));
    if (hasBlockingViolation(violations)) {
      return Response.json({
        error: 'That wording could get the page taken down. Try saying it without the guarantee.',
        violations: violations.map((v) => v.rule),
      }, { status: 422 });
    }
  }

  const STORE_FIELDS = new Set(['bio', 'name']);
  const PRODUCT_FIELDS = new Set([
    'title', 'promise', 'description', 'points', 'price', 'checkout_link',
  ]);

  if (STORE_FIELDS.has(body.field)) {
    await db().from('stores').update({ [body.field]: body.value }).eq('id', store.id);
  } else if (body.productId && PRODUCT_FIELDS.has(body.field)) {
    await db().from('products')
      .update({ [body.field]: body.value })
      .eq('id', body.productId).eq('store_id', store.id);
  } else {
    return Response.json({ error: 'unknown_field' }, { status: 400 });
  }

  await logEvent(store.id, body.field === 'price' ? 'price_changed' : 'field_edited', {
    field: body.field, action: 'edited',
  });
  return Response.json({ ok: true });
}

/** Publish, unpublish, and the ownership check. */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const store = await load(token);
  if (!store) return Response.json({ error: 'not_found' }, { status: 404 });
  if (store.is_sample) {
    return Response.json({ error: 'Sample stores cannot be published.' }, { status: 403 });
  }

  const { action } = await req.json() as {
    action: 'publish' | 'unpublish' | 'check_code' | 'get_code';
  };

  // Issue the bio code on demand, when the creator reaches the publish step.
  // Issued once and reused, so reloading the page does not change the code
  // the creator has already pasted into their bio.
  if (action === 'get_code') {
    if (store.input_type !== 'handle') {
      return Response.json({ error: 'no_code_needed' }, { status: 400 });
    }
    if (store.ownership_code) return Response.json({ code: store.ownership_code });
    const code = newOwnershipCode();
    await db().from('stores').update({ ownership_code: code }).eq('id', store.id);
    return Response.json({ code });
  }

  if (action === 'unpublish') {
    await db().from('stores').update({ status: 'unpublished' }).eq('id', store.id);
    return Response.json({ ok: true, status: 'unpublished' });
  }

  // PRD §FR5: a handle-built store publishes only once the code is in the bio.
  if (action === 'check_code') {
    if (store.input_type !== 'handle' || !store.handle) {
      return Response.json({ error: 'no_code_needed' }, { status: 400 });
    }
    try {
      const bio = await readBio(store.handle);
      const found = store.ownership_code
        ? bio.toUpperCase().includes(store.ownership_code.toUpperCase())
        : false;
      await logEvent(store.id, 'ownership_checked', { result: found ? 'found' : 'not_found' });
      if (!found) {
        return Response.json({ found: false, message: "We couldn't find the code in your bio yet. Save it on Instagram, then try again." });
      }
      await db().from('stores')
        .update({ ownership_confirmed_at: new Date().toISOString() })
        .eq('id', store.id);
      return Response.json({ found: true });
    } catch (err) {
      const kind = err instanceof ScrapeError ? err.kind : 'upstream';
      await logEvent(store.id, 'ownership_checked', { result: 'read_failed' });
      return Response.json({ found: false, message: 'We could not read your bio just now. Try again in a moment.', kind }, { status: 503 });
    }
  }

  // Publish.
  if (store.input_type === 'handle' && !store.ownership_confirmed_at) {
    return Response.json({ error: 'ownership_required' }, { status: 403 });
  }
  // The draft slug comes from whatever name the build guessed, which for a
  // description with no name is a placeholder. Publishing is the first
  // moment the URL becomes public and permanent, so settle it from the
  // creator's final name then — but never move a slug already published.
  let slug = store.slug;
  const desired = slugify(store.name ?? 'store', store.handle);
  if (!slug || (store.status !== 'published' && slug !== desired)) {
    slug = await uniqueSlug(desired);
  }
  await db().from('stores')
    .update({ status: 'published', slug })
    .eq('id', store.id);

  const products = await getProducts(store.id);
  await logEvent(store.id, 'store_published', { product_count: products.length });
  return Response.json({ ok: true, slug, status: 'published' });
}
