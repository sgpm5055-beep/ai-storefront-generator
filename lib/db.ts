/**
 * Supabase access. All writes go through the service role from server
 * code; the anon key is only used by the browser to read published stores,
 * which RLS allows. PRD §Architecture.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';

let admin: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!admin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase is not configured');
    admin = createClient(url, key, { auth: { persistSession: false } });
  }
  return admin;
}

/** Edit token: 128-bit random, stored hashed. PRD §Privacy and security. */
export function newEditToken(): { token: string; hash: string } {
  const token = randomBytes(16).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Build ids are random and unguessable: the build page shows draft content. */
export function newBuildId(): string {
  return randomBytes(12).toString('base64url');
}

/** A short code the creator puts in their bio to prove ownership. */
export function newOwnershipCode(): string {
  return 'SP-' + randomBytes(3).toString('hex').toUpperCase();
}

/** Route names a store slug can never take. PRD §UI rules. */
const RESERVED = new Set([
  'api', 'build', 'edit', 's', 'og', '_next', 'favicon.ico',
  'robots.txt', 'sitemap.xml', 'not-found', 'sample',
  // 'creator' is the pipeline's placeholder when a description gives no
  // name. Reserving it stops the first unnamed store from claiming the
  // generic URL, which would read as ours rather than theirs.
  'creator', 'store', 'untitled',
]);

export function slugify(name: string, handle: string | null): string {
  const base = (handle || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'store';
  return RESERVED.has(base) ? `${base}-store` : base;
}

/** Slugs must be unique; add a short suffix when taken. */
export async function uniqueSlug(desired: string): Promise<string> {
  const { data } = await db().from('stores').select('slug').eq('slug', desired).maybeSingle();
  if (!data) return desired;
  return `${desired}-${randomBytes(2).toString('hex')}`;
}

export async function logEvent(
  storeId: string | null,
  name: string,
  props: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db().from('events').insert({
      store_id: storeId, name, prompt_version: 'v1', props,
    });
  } catch {
    // Instrumentation must never break a build.
  }
}

/** Per-device rate limiting. PRD §FR6: 5 generations per hour. */
export const RATE_LIMIT_PER_HOUR = 5;

export async function checkRateLimit(bucketKey: string): Promise<{ allowed: boolean; retryAfterMin: number }> {
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db()
    .from('rate_limits')
    .select('id', { count: 'exact', head: true })
    .eq('bucket_key', bucketKey)
    .gte('created_at', since);

  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return { allowed: false, retryAfterMin: 60 };
  }
  await db().from('rate_limits').insert({ bucket_key: bucketKey });
  return { allowed: true, retryAfterMin: 0 };
}
