import { describe, it, expect } from 'vitest';
import { buildTrace, TRACE } from './trace';

const job = (stage: string, status: string, at: string, detail?: string, error?: string) => ({
  stage, stage_status: status, detail: detail ?? null, error: error ?? null, created_at: at,
});

const HANDLE_JOBS = [
  job('scrape_profile', 'running', '2026-11-22T10:00:00Z'),
  job('scrape_profile', 'done', '2026-11-22T10:00:10Z', 'Found Shivesh · 37,76,709 followers'),
  job('scrape_posts', 'done', '2026-11-22T10:00:50Z', '30 posts'),
  job('transcribe', 'done', '2026-11-22T10:01:20Z', '8 posts with usable content'),
  job('profile', 'done', '2026-11-22T10:01:30Z', 'food'),
  job('check', 'done', '2026-11-22T10:01:40Z'),
];

const base = {
  inputType: 'handle',
  status: 'draft',
  validation: 'pass' as string | null,
  jobs: HANDLE_JOBS,
  judge: null as Record<string, unknown> | null,
};

describe('buildTrace: never show a number we did not measure', () => {
  it('leaves judge results empty when the build has no scores', () => {
    const t = buildTrace(base);
    const check = t.stages.find((s) => s.no === '9')!;
    for (const r of check.rows) expect(r.result).toBeUndefined();
  });

  it('shows the real judge scores when they exist', () => {
    const t = buildTrace({
      ...base,
      judge: { faithful: true, policy_ok: true, specificity: 4, makeability: 5, voice_match: 3 },
    });
    const rows = t.stages.find((s) => s.no === '9')!.rows;
    const by = (p: string) => rows.find((r) => r.text.startsWith(p))?.result;
    expect(by('Faithful')).toBe('Pass');
    expect(by('Specificity')).toBe('4 / 5');
    expect(by('Makeability')).toBe('5 / 5');
    expect(by('Voice')).toBe('3 / 5');
  });

  it('reports a failed hard gate as Fail, not as a score', () => {
    const t = buildTrace({ ...base, judge: { faithful: false, policy_ok: true } });
    const rows = t.stages.find((s) => s.no === '9')!.rows;
    expect(rows.find((r) => r.text.startsWith('Faithful'))?.result).toBe('Fail');
  });
});

describe('buildTrace: stage status', () => {
  it('marks Instagram stages skipped on the description path', () => {
    const t = buildTrace({ ...base, inputType: 'description', jobs: [] });
    for (const s of t.stages.filter((x) => x.ig)) {
      expect(s.status).toBe('skipped');
    }
  });

  it('carries a stop reason onto the stage that stopped', () => {
    const t = buildTrace({
      ...base,
      status: 'failed',
      jobs: [...HANDLE_JOBS.slice(0, 3),
        job('check', 'failed', '2026-11-22T10:01:00Z', undefined, 'Only 2 posts had enough content.')],
    });
    const check = t.stages.find((s) => s.no === '9')!;
    expect(check.status).toBe('failed');
    expect(check.error).toContain('Only 2 posts');
    expect(t.outcome).toBe('Stopped');
  });

  it('shows directions only when the build took that branch', () => {
    expect(buildTrace(base).stages.find((s) => s.no === '4b')!.status).toBe('skipped');
    expect(
      buildTrace({ ...base, status: 'directions' }).stages.find((s) => s.no === '4b')!.status,
    ).toBe('done');
  });

  it('measures run time from the real job timestamps', () => {
    // 10:00:00 -> 10:01:40 is 100s.
    expect(buildTrace(base).runMs).toBe(100_000);
  });

  it('reports no run time when there are no jobs yet', () => {
    expect(buildTrace({ ...base, jobs: [] }).runMs).toBeNull();
  });

  it('names the path and outcome', () => {
    expect(buildTrace(base).path).toBe('handle');
    expect(buildTrace({ ...base, inputType: 'description' }).path).toBe('description');
    expect(buildTrace({ ...base, status: 'published' }).outcome).toBe('Published');
  });
});

describe('the trace itself', () => {
  it('covers every stage the pipeline records', () => {
    const keys = new Set(TRACE.map((s) => s.key));
    for (const k of ['scrape_profile', 'scrape_posts', 'transcribe', 'profile',
      'demand', 'products', 'price', 'copy', 'check']) {
      expect(keys.has(k)).toBe(true);
    }
  });

  it('states a gate for each hard guardrail', () => {
    const gates = TRACE.flatMap((s) => s.rows).filter((r) => r.t === 'Gate').map((r) => r.text);
    expect(gates.some((g) => /verbatim/i.test(g))).toBe(true);     // directions
    expect(gates.some((g) => /₹499/.test(g))).toBe(true);          // entry ceiling
    expect(gates.some((g) => /1\.5×/.test(g))).toBe(true);         // ladder step
    expect(gates.some((g) => /Ownership/i.test(g))).toBe(true);    // publish gate
  });
});

describe('stages that share a job key', () => {
  it('does not let Directions inherit the Profile stage output', () => {
    // Both map to the `profile` job row, so 4b would otherwise report
    // the niche as if it were its own result.
    const t = buildTrace({ ...base, status: 'directions' });
    const dir = t.stages.find((s) => s.no === '4b')!;
    const prof = t.stages.find((s) => s.no === '4')!;
    expect(prof.detail).toBe('food');
    expect(dir.detail).toBeNull();
    expect(dir.ms).toBeNull();
  });
});
