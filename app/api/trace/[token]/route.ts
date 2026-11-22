/**
 * GET /api/trace/[token] — the pipeline trace for one build.
 *
 * Behind the edit token, not the build id: the trace exposes internal
 * decisions, stop reasons and judge scores, so it is for whoever holds
 * the draft, never for the public page.
 */
import { hashToken } from '@/lib/db';
import { getStoreByToken, getJobs, getEvents } from '@/lib/store';
import { buildTrace } from '@/lib/trace';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const store = await getStoreByToken(hashToken(token));
  if (!store) return Response.json({ error: 'not_found' }, { status: 404 });

  const [jobs, events] = await Promise.all([
    getJobs(store.id),
    getEvents(store.id).catch(() => []),
  ]);

  // Judge scores ride on the completion event; a build that stopped
  // before the check stage simply has none.
  const completed = [...events].reverse()
    .find((e) => e.name === 'generation_completed');

  return Response.json(buildTrace({
    inputType: store.input_type,
    status: store.status,
    validation: store.validation_result,
    jobs,
    judge: completed?.props ?? null,
  }));
}
