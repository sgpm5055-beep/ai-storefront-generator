/**
 * POST /api/regenerate — "Try another" on one product. PRD §FR4.
 *
 * A replacement for the same ladder slot is drawn from the unused
 * candidates, priced by the rules and written with one short model call.
 * The other products stay as they are.
 */
import { db, hashToken, logEvent } from '@/lib/db';
import { getStoreByToken, getProducts } from '@/lib/store';
import { priceLadder, type Format, type LadderRole, type Scope } from '@/lib/pricing';
import { runCopyStage } from '@/lib/stages/copy';
import { clampCopy, type Profile } from '@/lib/schemas';
import { checkDraft, hasBlockingViolation, regulatedNicheFor } from '@/lib/guardrails';

export const maxDuration = 120;

/** PRD §FR4: 5 regenerations per store, then it is disabled with a reason. */
const REGEN_CAP = 5;

export async function POST(req: Request) {
  const { token, productId } = await req.json() as { token: string; productId: string };
  const store = await getStoreByToken(hashToken(token));
  if (!store) return Response.json({ error: 'not_found' }, { status: 404 });
  if (store.is_sample) {
    return Response.json({ error: 'Sample stores are read-only.' }, { status: 403 });
  }

  const { count } = await db()
    .from('events').select('id', { count: 'exact', head: true })
    .eq('store_id', store.id).eq('name', 'item_regenerated');
  if ((count ?? 0) >= REGEN_CAP) {
    return Response.json({
      error: `You've regenerated ${REGEN_CAP} times. Edit the text directly to keep changing it.`,
      capped: true,
    }, { status: 429 });
  }

  const products = await getProducts(store.id);
  const target = products.find((p) => p.id === productId);
  if (!target) return Response.json({ error: 'no_such_product' }, { status: 404 });

  // Candidates are stored on the store row when the build finishes.
  const { data: row } = await db().from('stores')
    .select('unused_candidates, niche, name, language').eq('id', store.id).single();
  const unused = (row?.unused_candidates as unknown[] | null) ?? [];
  if (!unused.length) {
    return Response.json({
      error: 'No other ideas left for this slot. Edit the text directly instead.',
      capped: true,
    }, { status: 409 });
  }

  const { pickReplacement } = await import('@/lib/stages/products');
  const role = target.ladder_role as LadderRole;
  const replacement = pickReplacement(
    unused as never[], role, products.map((p) => p.title ?? ''),
  );
  if (!replacement) {
    return Response.json({
      error: 'No other ideas left for this slot. Edit the text directly instead.',
      capped: true,
    }, { status: 409 });
  }

  // Reprice the whole ladder: swapping one product can break rule 3.
  const ladder = products.map((p) => ({
    format: (p.id === productId ? replacement.format : p.format) as Format,
    niche: store.niche ?? 'other',
    followers: store.followers,
    scope: (p.id === productId ? replacement.scope : 'standard') as Scope,
    role: p.ladder_role as LadderRole,
  }));
  const priced = priceLadder(ladder);
  const idx = products.findIndex((p) => p.id === productId);

  const profile = {
    name_guess: store.name ?? '', niche: store.niche ?? 'other',
    skills: [], audience: '', language: store.language ?? 'en',
    register: 'as in their own posts', evidence: [],
    signal_strength: 'adequate', teachable: true, stop_reason: null,
  } as unknown as Profile;

  const copy = clampCopy(await runCopyStage(
    profile,
    [{ candidate: replacement, price: priced[idx].price, role }],
    [target.description ?? ''],
  ));
  const written = copy.products[0];

  const violations = checkDraft(
    { bio: null, products: [written] }, regulatedNicheFor(store.niche ?? ''),
  );
  if (hasBlockingViolation(violations)) {
    return Response.json({ error: 'That idea did not pass our checks. Try again.' }, { status: 422 });
  }

  await db().from('products').update({
    format: replacement.format,
    title: written.title,
    promise: written.promise,
    description: written.description,
    points: written.points,
    price: priced[idx].price,
    suggested_price: priced[idx].suggestedPrice,
    price_reason: priced[idx].reason,
    scope: priced[idx].scope,
    effort: replacement.effort,
    demand_item: replacement.demand_item,
    evidence: replacement.evidence,
  }).eq('id', productId).eq('store_id', store.id);

  // Remove the used candidate so "Try another" never repeats itself.
  await db().from('stores').update({
    unused_candidates: unused.filter(
      (c) => (c as { working_title?: string }).working_title !== replacement.working_title,
    ),
  }).eq('id', store.id);

  await logEvent(store.id, 'item_regenerated', { field: 'product', role });
  return Response.json({
    ok: true,
    remaining: REGEN_CAP - (count ?? 0) - 1,
    product: { ...written, price: priced[idx].price, priceReason: priced[idx].reason },
  });
}
