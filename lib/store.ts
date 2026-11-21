/**
 * Persisting a build. Turns a BuildResult into store, product and job rows,
 * and reads them back for the edit and public pages.
 */
import { db, newEditToken, slugify, uniqueSlug, logEvent } from './db';
import type { BuildResult, StageName } from './pipeline';
import type { Direction } from './schemas';

export interface StoreRow {
  id: string;
  slug: string | null;
  handle: string | null;
  input_type: 'handle' | 'description';
  name: string | null;
  avatar_url: string | null;
  followers: number | null;
  bio: string | null;
  niche: string | null;
  language: string | null;
  status: 'building' | 'draft' | 'published' | 'unpublished' | 'failed' | 'directions';
  validation_result: string | null;
  ownership_code: string | null;
  ownership_confirmed_at: string | null;
  is_sample: boolean;
  parent_store_id: string | null;
  direction: { topic: string; because: string; quote: string } | null;
  created_at: string;
}

export interface ProductRow {
  id: string;
  position: number;
  ladder_role: 'entry' | 'core' | 'premium';
  format: 'digital' | 'webinar' | 'session' | 'course';
  title: string | null;
  promise: string | null;
  description: string | null;
  points: string[] | null;
  price: number | null;
  suggested_price: number | null;
  price_reason: string | null;
  effort: string | null;
  demand_item: string | null;
  evidence: string | null;
  checkout_link: string | null;
}

/** Create the shell row and its job, before the pipeline runs. */
export async function createBuild(input: {
  handle?: string; description?: string;
}): Promise<{ storeId: string; editToken: string }> {
  const { token, hash } = newEditToken();
  const { data, error } = await db().from('stores').insert({
    edit_token_hash: hash,
    handle: input.handle ?? null,
    input_type: input.handle ? 'handle' : 'description',
    description_text: input.description ?? null,
    status: 'building',
  }).select('id').single();

  if (error) throw new Error(`could not create store: ${error.message}`);
  await logEvent(data.id, 'input_submitted', {
    input_type: input.handle ? 'handle' : 'description',
  });
  return { storeId: data.id, editToken: token };
}

export async function recordStage(
  storeId: string,
  stage: StageName,
  status: 'running' | 'done' | 'failed' | 'skipped',
  detail?: string,
  error?: string,
): Promise<void> {
  await db().from('jobs').insert({
    store_id: storeId,
    stage,
    stage_status: status,
    detail: detail ?? null,
    error: error ?? null,
    started_at: status === 'running' ? new Date().toISOString() : null,
    finished_at: status === 'done' || status === 'failed' ? new Date().toISOString() : null,
  });
}

/** Write the finished draft. */
export async function saveResult(storeId: string, r: BuildResult): Promise<void> {
  const slug = await uniqueSlug(slugify(r.name, r.handle));

  const { error } = await db().from('stores').update({
    slug,
    name: r.name,
    avatar_url: r.avatarUrl,
    followers: r.followers,
    bio: r.bio,
    niche: r.niche,
    language: r.language,
    status: 'draft',
    validation_result: r.validation,
    // Kept so "Try another" can swap a product without a new ideation call.
    unused_candidates: r.unusedCandidates,
  }).eq('id', storeId);
  if (error) throw new Error(`could not save store: ${error.message}`);

  await db().from('products').delete().eq('store_id', storeId);
  const rows = r.products.map((p) => ({
    store_id: storeId,
    position: p.position,
    ladder_role: p.ladderRole,
    format: p.format,
    title: p.title,
    promise: p.promise,
    description: p.description,
    points: p.points,
    price: p.price,
    suggested_price: p.suggestedPrice,
    price_reason: p.priceReason,
    scope: p.scope,
    effort: p.effort,
    demand_item: p.demandItem,
    evidence: p.evidence,
  }));
  const { error: pErr } = await db().from('products').insert(rows);
  if (pErr) throw new Error(`could not save products: ${pErr.message}`);

  await logEvent(storeId, 'generation_completed', {
    validation: r.validation, products: r.products.length,
  });
}

/**
 * Three speculative drafts for a creator who teaches nothing directly.
 *
 * Each draft is a real store the creator can edit and publish, but it is
 * stored as a guess: validation_result is forced to 'template', which is
 * what renders the "this is a starting point, not a read of your account"
 * banner on the edit page. The parent row holds no products of its own.
 */
export async function saveDrafts(
  parentStoreId: string,
  drafts: Array<{ direction: Direction; result: BuildResult }>,
): Promise<Array<{ slug: string; editToken: string }>> {
  const made: Array<{ slug: string; editToken: string }> = [];
  for (const { direction, result } of drafts) {
    const slug = await uniqueSlug(slugify(`${result.name}-${direction.topic}`, null));
    const { token, hash } = newEditToken();

    const { data, error } = await db().from('stores').insert({
      slug,
      edit_token_hash: hash,
      handle: result.handle,
      input_type: result.handle ? 'handle' : 'description',
      description_text: direction.seed,
      name: result.name,
      avatar_url: result.avatarUrl,
      followers: result.followers,
      bio: result.bio,
      niche: result.niche,
      language: result.language,
      status: 'draft',
      // Never 'pass': nothing here was stated by the creator.
      validation_result: 'template',
      parent_store_id: parentStoreId,
      direction: {
        topic: direction.topic, because: direction.because, quote: direction.quote,
      },
      unused_candidates: result.unusedCandidates,
    }).select('id').single();
    if (error) throw new Error(`could not save draft: ${error.message}`);

    const { error: pErr } = await db().from('products').insert(
      result.products.map((p) => ({
        store_id: data.id, position: p.position, ladder_role: p.ladderRole,
        format: p.format, title: p.title, promise: p.promise,
        description: p.description, points: p.points, price: p.price,
        suggested_price: p.suggestedPrice, price_reason: p.priceReason,
        scope: p.scope, effort: p.effort, demand_item: p.demandItem,
        evidence: p.evidence,
      })),
    );
    if (pErr) throw new Error(`could not save draft products: ${pErr.message}`);
    made.push({ slug, editToken: token });
  }

  // The tokens live on the parent row, which is itself only reachable by
  // its own unguessable build id. A child's token is never recoverable
  // from the child, so an unchosen draft stays unaddressable.
  await db().from('stores').update({
    status: 'directions',
    direction: { drafts: made },
  }).eq('id', parentStoreId);
  await logEvent(parentStoreId, 'directions_offered', { count: drafts.length });
  return made;
}

/**
 * The drafts offered for a parent build, for the chooser screen.
 *
 * No edit token here: only its hash is stored, which is the point. The
 * chooser links by slug and the edit link is minted when the creator
 * picks one, so a draft nobody chose was never addressable.
 */
export async function getDrafts(parentStoreId: string): Promise<Array<{
  id: string; slug: string | null; name: string | null;
  direction: { topic: string; because: string; quote: string } | null;
  products: Array<{ title: string | null; price: number | null; format: string }>;
}>> {
  const { data } = await db().from('stores')
    .select('id,slug,name,direction')
    .eq('parent_store_id', parentStoreId).order('created_at');

  const out = [];
  for (const row of data ?? []) {
    const { data: prods } = await db().from('products')
      .select('title,price,format').eq('store_id', row.id).order('position');
    out.push({
      id: row.id, slug: row.slug, name: row.name,
      direction: row.direction as { topic: string; because: string; quote: string } | null,
      products: prods ?? [],
    });
  }
  return out;
}

export async function markFailed(
  storeId: string,
  reason: string,
  found?: { name: string | null; avatarUrl: string | null; followers: number | null },
): Promise<void> {
  // Keep whatever the scrape already learned. A build that found the
  // creator and then stopped should still be able to greet them by name;
  // dropping it makes the failure screen read as if nothing worked.
  await db().from('stores').update({
    status: 'failed',
    ...(found?.name ? { name: found.name } : {}),
    ...(found?.avatarUrl ? { avatar_url: found.avatarUrl } : {}),
    ...(found?.followers ? { followers: found.followers } : {}),
  }).eq('id', storeId);
  await recordStage(storeId, 'check', 'failed', undefined, reason);
}

export async function getStoreById(id: string): Promise<StoreRow | null> {
  const { data } = await db().from('stores').select('*').eq('id', id).maybeSingle();
  return (data as StoreRow) ?? null;
}

export async function getStoreByToken(tokenHash: string): Promise<StoreRow | null> {
  const { data } = await db().from('stores').select('*')
    .eq('edit_token_hash', tokenHash).maybeSingle();
  return (data as StoreRow) ?? null;
}

export async function getStoreBySlug(slug: string): Promise<StoreRow | null> {
  const { data } = await db().from('stores').select('*').eq('slug', slug).maybeSingle();
  return (data as StoreRow) ?? null;
}

export async function getProducts(storeId: string): Promise<ProductRow[]> {
  const { data } = await db().from('products').select('*')
    .eq('store_id', storeId).order('position');
  return (data as ProductRow[]) ?? [];
}

export interface JobRow {
  stage: StageName;
  stage_status: 'running' | 'done' | 'failed' | 'skipped';
  detail: string | null;
  error: string | null;
  created_at: string;
}

export async function getJobs(storeId: string): Promise<JobRow[]> {
  const { data } = await db().from('jobs').select('stage,stage_status,detail,error,created_at')
    .eq('store_id', storeId).order('created_at');
  return (data as JobRow[]) ?? [];
}

/** Seeded demo stores for the start page. Plain rows: no third-party call. */
export async function listSamples(): Promise<
  { slug: string; name: string; niche: string }[]
> {
  const { data } = await db().from('stores')
    .select('slug,name,niche')
    .eq('is_sample', true).eq('status', 'published')
    .order('created_at');
  return (data ?? []).filter(
    (r): r is { slug: string; name: string; niche: string } =>
      Boolean(r.slug && r.name),
  );
}
