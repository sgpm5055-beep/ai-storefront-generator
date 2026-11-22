/**
 * POST /api/generate — start a build.
 *
 * Returns immediately with a build id; the pipeline continues in the
 * background through waitUntil, so the build survives a closed tab.
 * PRD §Architecture: the start request returns at once.
 */
import { after } from 'next/server';
import { runPipeline, type ProgressEvent } from '@/lib/pipeline';
import { normaliseHandle } from '@/lib/scrape';
import { createBuild, recordStage, saveResult, markFailed, saveDrafts, saveIdentity } from '@/lib/store';
import { checkRateLimit, logEvent } from '@/lib/db';
import { describeIsUsable } from '@/lib/stages/profile';

export const maxDuration = 300;   // Vercel Hobby ceiling.

export async function POST(req: Request) {
  let body: { handle?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const handleRaw = (body.handle ?? '').trim();
  const description = (body.description ?? '').trim();

  // PRD §FR1: validate before starting any scrape.
  let handle: string | null = null;
  if (handleRaw) {
    handle = normaliseHandle(handleRaw);
    if (!handle) {
      return Response.json(
        { error: "That doesn't look like an Instagram handle. Try a name like @yourname." },
        { status: 400 },
      );
    }
  } else if (!describeIsUsable(description)) {
    return Response.json(
      { error: 'Tell us a bit more: around 40 words about what you teach and who you help.' },
      { status: 400 },
    );
  }

  // PRD §FR6: per-device rate limit.
  const device = req.headers.get('x-device-id')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]
    ?? 'unknown';
  const limit = await checkRateLimit(device);
  if (!limit.allowed) {
    return Response.json(
      { error: `You've built a few stores already. Try again in about ${limit.retryAfterMin} minutes.` },
      { status: 429 },
    );
  }

  const { storeId, editToken } = await createBuild(
    handle ? { handle } : { description },
  );

  // The build continues after the response is sent.
  after(async () => {
    const onProgress = async (e: ProgressEvent) => {
      await recordStage(storeId, e.stage, e.status, e.detail);
      // Write identity the moment the scrape has it, so every later
      // failure path inherits it rather than having to remember.
      if (e.found) await saveIdentity(storeId, e.found);
    };
    try {
      await logEvent(storeId, 'generation_started');
      const result = await runPipeline(
        handle ? { handle } : { description }, onProgress,
      );
      if (result.ok === 'directions') {
        // A substantive creator who teaches nothing: three drafts to
        // choose from rather than a dead end.
        await saveDrafts(storeId, result.drafts);
      } else if (result.ok) {
        await saveResult(storeId, result);
      } else {
        await markFailed(storeId, result.reason, result.found);
      }
    } catch (err) {
      // An unexpected throw must not reach the creator as a raw exception
      // message. Seen in testing: a transient upstream error produced an
      // empty message, so the build screen fell back to the bare "We could
      // not build this store." with no next step offered.
      //
      // Whatever the scrape already learned is still on the row, so the
      // failure screen can keep greeting them by name.
      console.error('[build] unexpected failure', storeId, err);
      await markFailed(
        storeId,
        'Something went wrong on our side while building this. '
        + 'Try again, or describe yourself in a few lines instead.',
      );
    }
  });

  return Response.json({ buildId: storeId, editToken }, { status: 202 });
}
