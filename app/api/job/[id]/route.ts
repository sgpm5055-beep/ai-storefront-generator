/**
 * GET /api/job/[id] — progress for the build screen.
 *
 * Polled every 1.5s. Chosen over Supabase Realtime because Realtime needs
 * per-table replication enabled and fails silently if it is not, and a
 * build has exactly one viewer.
 */
import { getStoreById, getJobs, getProducts, getDrafts } from '@/lib/store';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = await getStoreById(id);
  if (!store) return Response.json({ error: 'not_found' }, { status: 404 });

  const jobs = await getJobs(id);

  // Latest status per stage, in the order the stages ran.
  const stages = new Map<string, { status: string; detail: string | null }>();
  for (const j of jobs) {
    stages.set(j.stage, { status: j.stage_status, detail: j.detail });
  }
  const failed = jobs.find((j) => j.stage_status === 'failed');

  const body: Record<string, unknown> = {
    status: store.status,
    name: store.name,
    avatarUrl: store.avatar_url,
    followers: store.followers,
    handle: store.handle,
    stages: [...stages.entries()].map(([stage, s]) => ({ stage, ...s })),
  };

  if (store.status === 'failed') {
    body.error = failed?.error ?? 'We could not build this store.';
  }
  // A substantive creator who teaches nothing gets three drafts to pick
  // between, not a store and not a dead end.
  if (store.status === 'directions') {
    const tokens = (store.direction as { drafts?: Array<{ slug: string; editToken: string }> } | null)?.drafts ?? [];
    const drafts = await getDrafts(id);
    body.drafts = drafts.map((d, i) => ({
      slug: d.slug,
      editToken: tokens[i]?.editToken ?? null,
      topic: d.direction?.topic ?? '',
      because: d.direction?.because ?? '',
      quote: d.direction?.quote ?? '',
      products: d.products.map((p) => ({
        title: p.title, price: p.price, format: p.format,
      })),
    }));
  } else if (store.status !== 'building') {
    body.products = (await getProducts(id)).length;
    body.slug = store.slug;
  }
  return Response.json(body);
}
