/**
 * The pipeline trace, for reviewers.
 *
 * Every stage, the decisions it makes and the gates it enforces, in
 * plain language. Creators never see this; it exists so someone
 * evaluating the product can check that the guardrails described in the
 * README are the ones actually running.
 *
 * The prose is fixed because it describes the design. Anything numeric
 * is filled from the build's own jobs and events, so a reviewer is never
 * shown an illustrative figure dressed up as a measurement — a trace
 * that quietly invents its own numbers would be the exact failure the
 * faithfulness gate exists to prevent.
 */

export type RowKind = 'Decision' | 'Gate' | 'Output' | 'Stopped';
export type StageKind = 'Code' | 'Model' | 'Speech' | 'Code + model';

export interface TraceRow {
  t: RowKind;
  text: string;
  /** Filled at request time from real data; absent when unknown. */
  result?: string;
}

export interface TraceStage {
  no: string;
  /** The jobs-table stage this maps to, for live status. */
  key: string;
  /** True for stages that only run on the handle path. */
  ig?: boolean;
  name: string;
  kind: StageKind;
  rows: TraceRow[];
}

/**
 * Static scaffold. `buildTrace` attaches live status and real results.
 * Wording mirrors the README pipeline table plus lib/pricing.ts,
 * lib/select.ts and lib/stages/check.ts.
 */
export const TRACE: TraceStage[] = [
  {
    no: '1a', key: 'scrape_profile', ig: true, name: 'Scrape profile', kind: 'Code',
    rows: [
      { t: 'Decision', text: 'The profile is fetched on its own, about 10 seconds, so the creator sees “Found you” before the slow posts call finishes.' },
      { t: 'Gate', text: 'Account must be public, and must have posts. A private or empty account stops here and is offered the description path.' },
    ],
  },
  {
    no: '1b', key: 'scrape_posts', ig: true, name: 'Scrape posts', kind: 'Code',
    rows: [
      { t: 'Decision', text: '30 posts, about 40 seconds. The slower fetch mode is used because it is the only one that returns play counts.' },
    ],
  },
  {
    no: '2', key: 'scrape_posts', ig: true, name: 'Pick posts', kind: 'Code',
    rows: [
      { t: 'Decision', text: 'Ranked: most-played reels first, then the most recent posts, then spares by plays and likes. Play count does not predict transcript quality, so more are queued than are needed.' },
      { t: 'Decision', text: 'Reels over 120 seconds are skipped: slow to fetch, little extra signal.' },
    ],
  },
  {
    no: '3', key: 'transcribe', ig: true, name: 'Transcribe', kind: 'Speech',
    rows: [
      { t: 'Decision', text: 'Batches of 4, in parallel, stopping early once enough posts are usable. Audio is fetched by URL rather than uploaded, which took the handle path from 243s to about 90s.' },
      { t: 'Decision', text: 'A reel with no speech falls back to its caption and is marked low signal.' },
      { t: 'Gate', text: 'At least 3 posts with 40 or more words. Below that the build stops rather than guessing.' },
    ],
  },
  {
    no: '4', key: 'profile', name: 'Profile', kind: 'Model',
    rows: [
      { t: 'Decision', text: 'Niche chosen from a fixed list so the pricing rules can act on it. Language and register are read from how the creator actually writes.' },
      { t: 'Gate', text: 'Evidence or silence. Every claim about the creator carries a verbatim quote from their posts.' },
      { t: 'Gate', text: 'Teachable skill found. If not, but there is a real person with real output, route to directions. If neither, stop.' },
    ],
  },
  {
    no: '4b', key: 'profile', name: 'Directions', kind: 'Model',
    rows: [
      { t: 'Decision', text: 'Only for a substantive creator who teaches nothing. Proposes things they could offer, never things they already do.' },
      { t: 'Gate', text: 'Each direction quotes the source verbatim; a quote that is not found is dropped, not repaired.' },
      { t: 'Gate', text: 'No claimed credentials, and no directions at all in a regulated niche.' },
    ],
  },
  {
    no: '5', key: 'demand', name: 'Demand', kind: 'Model',
    rows: [
      { t: 'Decision', text: 'Products come from what followers already ask, not from what would sell well in general.' },
    ],
  },
  {
    no: '6', key: 'products', name: 'Product candidates', kind: 'Model',
    rows: [
      { t: 'Decision', text: 'Asks for more candidates than needed, each with a format, a ladder slot, the want it answers, and scores for demand, ease of making and fit.' },
    ],
  },
  {
    no: '6b', key: 'products', name: 'Select', kind: 'Code',
    rows: [
      { t: 'Decision', text: 'Best-scoring candidate per ladder slot: first purchase, step up, premium. The rest are held back for “Try another”.' },
      { t: 'Gate', text: 'At least two different formats in the final set.' },
    ],
  },
  {
    no: '7', key: 'price', name: 'Price', kind: 'Code',
    rows: [
      { t: 'Decision', text: 'The model never sets a price. Typical price for the format, times niche, audience size and scope, kept inside the format’s band and snapped to a familiar price point.' },
      { t: 'Gate', text: 'Cheapest product is ₹499 or less.' },
      { t: 'Gate', text: 'Each product costs at least 1.5× the one below it.' },
      { t: 'Gate', text: 'Nothing above ₹4,999 for a first-time seller.' },
      { t: 'Decision', text: 'These rules apply at generation only. A creator’s own price edit is never pulled back.' },
    ],
  },
  {
    no: '8', key: 'copy', name: 'Write', kind: 'Model',
    rows: [
      { t: 'Decision', text: 'Written against the priced products, in the creator’s register. Their posts are passed as quoted data, never as instructions.' },
      { t: 'Decision', text: 'Over-long copy is trimmed on a word boundary instead of failing the whole stage.' },
    ],
  },
  {
    no: '9', key: 'check', name: 'Check', kind: 'Code + model',
    rows: [
      { t: 'Gate', text: 'Structure, by code: 2 to 4 products, bio within 150 characters, descriptions 40 to 80 words, 3 points each.' },
      { t: 'Gate', text: 'Policy, by code: no guaranteed results, invented proof or regulated advice.' },
      { t: 'Gate', text: 'Faithful, by judge. Hard gate: no claim the posts do not support.' },
      { t: 'Gate', text: 'Specificity. Could this store sit unchanged on another creator? Bar 3 of 5.' },
      { t: 'Gate', text: 'Makeability. Can the cheapest product be made in a weekend? Bar 3 of 5.' },
      { t: 'Gate', text: 'Voice match. Bar 2 of 5, the loosest because it is the most subjective.' },
      { t: 'Decision', text: 'Gated per dimension, never on an average. A fail triggers one rewrite with the offending lines quoted back; a second fail ships the better attempt with a notice.' },
    ],
  },
  {
    no: '→', key: 'after', name: 'After the draft', kind: 'Code',
    rows: [
      { t: 'Gate', text: 'Policy rules also run on text the creator types, across every niche. A guarantee typed into a bio is refused with a plain explanation.' },
      { t: 'Gate', text: 'Ownership. A handle-built store publishes only after a code is found in the Instagram bio.' },
    ],
  },
];

export interface TraceStageLive extends TraceStage {
  status: 'done' | 'running' | 'failed' | 'skipped' | 'pending';
  detail: string | null;
  error: string | null;
  ms: number | null;
}

export interface TraceResult {
  path: 'handle' | 'description';
  outcome: string;
  runMs: number | null;
  validation: string | null;
  stages: TraceStageLive[];
}

interface JobLike {
  stage: string;
  stage_status: string;
  detail: string | null;
  error: string | null;
  created_at: string;
}

const score = (n: unknown) => (typeof n === 'number' ? `${n} / 5` : undefined);

/**
 * Attach live status and real measurements to the static trace.
 *
 * A result is only set when the build actually produced one, so an
 * unfinished or stopped stage shows nothing rather than a plausible
 * number.
 */
export function buildTrace(
  input: {
    inputType: string;
    status: string;
    validation: string | null;
    jobs: JobLike[];
    judge: Record<string, unknown> | null;
  },
): TraceResult {
  const { jobs } = input;
  const isHandle = input.inputType === 'handle';

  // Latest row per stage wins; a stage can report running then done.
  const latest = new Map<string, JobLike>();
  const firstSeen = new Map<string, string>();
  for (const j of jobs) {
    latest.set(j.stage, j);
    if (!firstSeen.has(j.stage)) firstSeen.set(j.stage, j.created_at);
  }

  const started = jobs[0]?.created_at;
  const ended = jobs[jobs.length - 1]?.created_at;
  const runMs = started && ended
    ? new Date(ended).getTime() - new Date(started).getTime()
    : null;

  const judge = input.judge ?? {};

  const stages: TraceStageLive[] = TRACE.map((s) => {
    const row = latest.get(s.key);
    let status: TraceStageLive['status'] = 'pending';

    if (s.key === 'after') {
      status = input.status === 'published' ? 'done' : 'pending';
    } else if (s.ig && !isHandle) {
      status = 'skipped';
    } else if (row) {
      status = row.stage_status as TraceStageLive['status'];
    }

    // Directions only ran if the build actually took that branch.
    if (s.no === '4b') {
      status = input.status === 'directions' ? 'done' : 'skipped';
    }

    const start = firstSeen.get(s.key);
    const ms = start && row && row.stage_status !== 'running'
      ? new Date(row.created_at).getTime() - new Date(start).getTime()
      : null;

    // Real gate results, only for the stage that produced them.
    const rows = s.rows.map((r) => {
      if (s.no !== '9' || r.t !== 'Gate') return r;
      if (r.text.startsWith('Faithful')) {
        return { ...r, result: judge.faithful === undefined ? undefined : (judge.faithful ? 'Pass' : 'Fail') };
      }
      if (r.text.startsWith('Policy')) {
        return { ...r, result: judge.policy_ok === undefined ? undefined : (judge.policy_ok ? 'Pass' : 'Fail') };
      }
      if (r.text.startsWith('Specificity')) return { ...r, result: score(judge.specificity) };
      if (r.text.startsWith('Makeability')) return { ...r, result: score(judge.makeability) };
      if (r.text.startsWith('Voice')) return { ...r, result: score(judge.voice_match) };
      return r;
    });

    // Directions shares the `profile` job key, so it would otherwise
    // inherit that stage's detail and timing and report the niche as if
    // it were its own output.
    const ownRow = s.no === '4b' ? null : row;

    return {
      ...s,
      rows,
      status,
      detail: ownRow?.detail ?? null,
      error: ownRow?.error ?? null,
      ms: s.no === '4b' ? null : ms,
    };
  });

  const outcome = input.status === 'failed'
    ? 'Stopped'
    : input.status === 'directions'
      ? 'Directions offered'
      : input.status === 'published'
        ? 'Published'
        : input.status === 'draft' ? 'Draft ready' : 'Running';

  return {
    path: isHandle ? 'handle' : 'description',
    outcome,
    runMs,
    validation: input.validation,
    stages,
  };
}
