'use client';

import { useEffect, useState } from 'react';
import type { TraceResult, TraceStageLive } from '@/lib/trace';
import { Spinner } from './storefront';

/**
 * The reviewer's view of the pipeline.
 *
 * A storefront is generated text about a real person, so the useful
 * question is not "does it look good" but "what decided this, and what
 * would have stopped it". This drawer answers that: every stage, the
 * rules it applies, and the gates it passed or failed on THIS build.
 *
 * No backdrop, deliberately — the page stays readable beside it so a
 * reviewer can compare a claim in the trace against the thing it
 * produced.
 */

const STATUS_LABEL: Record<TraceStageLive['status'], string> = {
  done: 'Done',
  running: 'Running',
  failed: 'Stopped',
  skipped: 'Skipped',
  pending: 'Not run',
};

const KIND_COLOUR: Record<string, string> = {
  Code: '#A39A8D',
  Model: '#FDBA74',
  Speech: '#D9D2C6',
  'Code + model': '#D9D2C6',
};

export default function PipelineDrawer({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetched on first open, not on mount: a creator who never opens it
  // should not pay for the request.
  useEffect(() => {
    if (!open || trace || loading) return;
    setLoading(true);
    fetch(`/api/trace/${token}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTrace(d))
      .catch(() => { /* the drawer is an extra; never surface a failure */ })
      .finally(() => setLoading(false));
  }, [open, token, trace, loading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const dot = !trace
    ? '#D2CABD'
    : trace.outcome === 'Stopped' ? '#C2410C'
      : trace.outcome === 'Running' ? '#C2410C' : '#15803D';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-ghost-line px-3 font-mono text-xs text-muted transition hover:border-ink hover:text-ink"
        style={{ minHeight: 32 }}
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
        Pipeline
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Pipeline trace"
          className="fixed inset-y-0 right-0 z-50 overflow-y-auto px-[22px] pb-10 text-[14px]"
          style={{
            width: 'min(480px, 100%)',
            background: '#15130F',
            color: '#F2EEE7',
            boxShadow: '-30px 0 60px -20px rgba(21,19,15,.35)',
          }}
        >
          <div
            className="sticky top-0 flex items-start justify-between gap-4 pb-4 pt-6"
            style={{ background: '#15130F' }}
          >
            <div>
              <h2 className="font-display text-2xl font-semibold">Pipeline trace</h2>
              <p className="mt-1 text-[13px]" style={{ color: '#A39A8D' }}>
                For reviewers. Creators never see this.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close the pipeline trace"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
              style={{ borderColor: '#1F1C17', background: '#1F1C17' }}
            >
              ×
            </button>
          </div>

          {loading && <p style={{ color: '#A39A8D' }}>Reading the trace…</p>}

          {trace && (
            <>
              <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl" style={{ background: '#2A2620' }}>
                <Cell label="Path" value={trace.path} />
                <Cell
                  label="Run time"
                  value={trace.runMs ? `${(trace.runMs / 1000).toFixed(0)}s` : '—'}
                />
                <Cell label="Outcome" value={trace.outcome} />
              </div>

              {trace.validation && (
                <p className="mt-3 font-mono text-xs" style={{ color: '#A39A8D' }}>
                  validation: {trace.validation}
                </p>
              )}

              <ol className="mt-6 grid gap-6">
                {trace.stages.map((s) => (
                  <Stage key={`${s.no}-${s.name}`} stage={s} />
                ))}
              </ol>
            </>
          )}

          {!loading && !trace && (
            <p style={{ color: '#A39A8D' }}>The trace is not available for this build.</p>
          )}
        </div>
      )}
    </>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3" style={{ background: '#1F1C17' }}>
      <div className="text-[11px] uppercase tracking-[.08em]" style={{ color: '#A39A8D' }}>
        {label}
      </div>
      <div className="mt-1 font-mono text-[13px] font-semibold">{value}</div>
    </div>
  );
}

function Stage({ stage: s }: { stage: TraceStageLive }) {
  const inactive = s.status === 'pending' || s.status === 'skipped';
  const statusColour = s.status === 'done' ? '#4ADE80'
    : s.status === 'failed' ? '#FB923C' : '#A39A8D';

  return (
    <li style={{ opacity: inactive ? 0.45 : 1 }}>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs" style={{ color: '#A39A8D' }}>{s.no}</span>
        <span className="text-[16px] font-semibold">{s.name}</span>
        <span className="font-mono text-[11px]" style={{ color: KIND_COLOUR[s.kind] }}>
          {s.kind}
        </span>
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[11px]" style={{ color: statusColour }}>
          {s.status === 'running' && <Spinner light />}
          {STATUS_LABEL[s.status]}
          {s.ms !== null && s.status === 'done' && (
            <span style={{ color: '#A39A8D' }}>· {(s.ms / 1000).toFixed(1)}s</span>
          )}
        </span>
      </div>

      <div className="mt-2.5 grid gap-2">
        {s.rows.map((r, i) => (
          <div key={i} className="flex gap-3">
            <span
              className="shrink-0 font-mono text-[11px] uppercase tracking-[.06em]"
              style={{ width: 62, color: '#A39A8D' }}
            >
              {r.t}
            </span>
            <span className="min-w-0 flex-1 leading-[1.5]" style={{ color: '#D9D2C6' }}>
              {r.text}
            </span>
            {r.result && s.status === 'done' && (
              <span
                className="shrink-0 font-mono text-xs font-semibold"
                style={{ color: /fail/i.test(r.result) ? '#FB923C' : '#4ADE80' }}
              >
                {r.result}
              </span>
            )}
          </div>
        ))}

        {s.detail && s.status === 'done' && (
          <div className="flex gap-3">
            <span className="shrink-0 font-mono text-[11px] uppercase tracking-[.06em]" style={{ width: 62, color: '#A39A8D' }}>
              Output
            </span>
            <span className="min-w-0 flex-1 leading-[1.5]">{s.detail}</span>
          </div>
        )}

        {s.error && (
          <div className="flex gap-3">
            <span className="shrink-0 font-mono text-[11px] uppercase tracking-[.06em]" style={{ width: 62, color: '#FB923C' }}>
              Stopped
            </span>
            <span className="min-w-0 flex-1 leading-[1.5]" style={{ color: '#FB923C' }}>
              {s.error}
            </span>
          </div>
        )}
      </div>
    </li>
  );
}
