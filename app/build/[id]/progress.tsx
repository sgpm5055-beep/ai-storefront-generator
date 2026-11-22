'use client';

import { useEffect, useRef, useState } from 'react';
import { firstName } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { Notice, Spinner } from '@/components/ui';

/** Same per-browser id the start form uses, so the rate limit is one identity. */
function deviceId(): string {
  try {
    let id = localStorage.getItem('sf_device');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('sf_device', id); }
    return id;
  } catch { return 'no-storage'; }
}

/**
 * Named steps, not a bar. The PRD's reason: a creator waiting ~30-90s
 * needs to see that something specific is happening to *their* account,
 * not a generic spinner.
 */
const STEPS: { key: string; label: string }[] = [
  { key: 'scrape_profile', label: 'Finding your account' },
  { key: 'scrape_posts', label: 'Reading your recent posts' },
  { key: 'transcribe', label: 'Listening to your reels' },
  { key: 'profile', label: 'Working out what you teach' },
  { key: 'demand', label: 'Looking for what people ask you' },
  { key: 'products', label: 'Drafting things you could sell' },
  { key: 'price', label: 'Setting prices in rupees' },
  { key: 'copy', label: 'Writing it up' },
  { key: 'check', label: 'Checking it reads right' },
];

interface Job {
  status: string;
  name: string | null;
  avatarUrl: string | null;
  followers: number | null;
  handle: string | null;
  stages: { stage: string; status: string; detail: string | null }[];
  error?: string;
  slug?: string | null;
  drafts?: Draft[];
}

interface Draft {
  slug: string | null;
  editToken: string | null;
  topic: string;
  because: string;
  quote: string;
  products: { title: string | null; price: number | null; format: string }[];
}

export default function BuildProgress({ id, token }: { id: string; token: string }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [tooLong, setTooLong] = useState(false);
  const [dead, setDead] = useState<string | null>(null);
  const [lostToken, setLostToken] = useState(false);
  const started = useRef(Date.now());

  useEffect(() => {
    let stop = false;
    let misses = 0;

    async function tick() {
      try {
        const res = await fetch(`/api/job/${id}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        misses = 0;
        const data: Job = await res.json();
        if (stop) return;
        setJob(data);

        if (data.status === 'draft' || data.status === 'published') {
          let t = token;
          if (!t) { try { t = localStorage.getItem(`sf_token_${id}`) ?? ''; } catch {} }
          // Navigating with an empty token lands on /edit/ -> 404, and the
          // creator is locked out of a draft that built successfully. This
          // happens when ?t= is stripped (Instagram's in-app browser) and
          // storage is unavailable (iOS private mode).
          if (!t) { stop = true; setLostToken(true); return; }
          router.replace(`/edit/${t}`);
          return;
        }
        if (data.status === 'failed' || data.status === 'directions') { stop = true; return; }
      } catch {
        // A dropped poll is normal on mobile data. Only give up after a run.
        if (++misses >= 8) {
          setDead('We lost touch with the build. Your draft may still be fine — reload this page.');
          return;
        }
      }
      if (Date.now() - started.current > 100_000) setTooLong(true);
      if (!stop) setTimeout(tick, 1500);
    }
    tick();
    return () => { stop = true; };
  }, [id, token, router]);

  const statusOf = (key: string) =>
    job?.stages.find((s) => s.stage === key)?.status ?? 'pending';
  const detailOf = (key: string) =>
    job?.stages.find((s) => s.stage === key)?.detail ?? null;

  // Skipped stages are hidden rather than shown as skipped: a creator who
  // typed a description should not see three greyed-out scraping steps.
  const visible = STEPS.filter((s) => statusOf(s.key) !== 'skipped');

  const greeting = firstName(job?.name);

  if (job?.status === 'directions') {
    return job.drafts?.length
      ? <Chooser job={job} drafts={job.drafts} />
      : (
        // Without this the component falls through to the step list,
        // which has already stopped polling: a frozen screen forever.
        <div className="grid gap-5">
          <h1 className="text-2xl font-semibold">We couldn&rsquo;t find an angle for this one.</h1>
          <Notice>
            We read your posts but couldn&rsquo;t work out what you could sell.
            Tell us in your own words and we&rsquo;ll build from that.
          </Notice>
          <a href="/?mode=describe" className="btn-primary">Describe yourself instead</a>
        </div>
      );
  }

  if (lostToken) {
    return (
      <div className="grid gap-5">
        <h1 className="text-2xl font-semibold">Your storefront is ready.</h1>
        <Notice tone="info">
          We lost the private link to this draft in your browser. Open the
          original link you were sent, or start again &mdash; nothing you typed
          is lost.
        </Notice>
        <p className="text-sm text-muted">Build reference: <code>{id}</code></p>
        <a href="/" className="btn-primary">Start again</a>
      </div>
    );
  }

  if (job?.status === 'failed' || dead) {
    // If the scrape identified them before stopping, say so. "We found you,
    // but couldn't find a skill" is a different message from "it broke".
    const who = firstName(job?.name);
    return (
      <div className="grid gap-5">
        <h1 className="text-2xl font-semibold">
          {who
            ? `We found you, ${who} \u2014 but not a store yet.`
            : 'We couldn\u2019t finish this one.'}
        </h1>
        <Notice>
          {dead ?? job?.error ?? 'Something went wrong.'}
        </Notice>
        <div className="flex flex-wrap gap-2">
          <a href="/" className="btn-primary">Start again</a>
          <a href="/?mode=describe" className="btn-secondary">Describe yourself instead</a>
        </div>
        <p className="text-sm text-muted">
          Describing yourself in a few lines works just as well — it skips
          Instagram entirely.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {greeting ? `Found you, ${greeting}.` : 'Building your storefront'}
        </h1>
        <p className="mt-1 text-muted">
          {job?.followers
            ? `${job.followers.toLocaleString('en-IN')} followers · reading your posts now`
            : 'This takes under a minute. You can keep this tab open.'}
        </p>
      </div>

      <p className="sr-only" aria-live="polite">
        {visible.find((s) => statusOf(s.key) === 'running')?.label ?? ''}
      </p>

      <ol className="grid gap-1">
        {visible.map((s) => {
          const st = statusOf(s.key);
          return (
            <li key={s.key} className="flex items-start gap-3 py-2">
              <span aria-hidden className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                {st === 'done' ? (
                  <svg viewBox="0 0 20 20" className="h-5 w-5 text-ink" fill="currentColor">
                    <path d="M8 13.2 4.8 10l-1.1 1.1L8 15.4l8.3-8.3-1.1-1.1z" />
                  </svg>
                ) : st === 'running' ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-line" />
                )}
              </span>
              <span className="min-w-0">
                <span className={st === 'pending' ? 'text-muted' : 'text-ink'}>{s.label}</span>
                {detailOf(s.key) && (
                  <span className="block line-clamp-2 text-sm text-muted">{detailOf(s.key)}</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      {!job && <Spinner label="Starting…" />}

      {tooLong && (
        <Notice tone="info">
          This one is taking longer than usual — your reels are probably long.
          We&rsquo;ll keep going; nothing is lost if you wait.
        </Notice>
      )}
    </div>
  );
}

const FORMAT_LABEL: Record<string, string> = {
  digital: 'Download', webinar: 'Live workshop',
  session: '1:1 session', course: 'Course',
};

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/**
 * Three directions for a creator who teaches nothing directly.
 *
 * The honesty of this screen is the whole point: it says plainly that we
 * could not find a skill, that these are guesses, and it shows the
 * creator's own words under each one so the guess is checkable.
 */
function Chooser({ job, drafts }: { job: Job; drafts: Draft[] }) {
  const who = firstName(job.name);
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold">
          {who ? `We found you, ${who}.` : 'We found you.'}
        </h1>
        <p className="mt-2 text-muted">
          You don&rsquo;t teach a skill directly, so we didn&rsquo;t invent one.
          But your audience would pay for something. Here are three directions
          we drew out of your own posts &mdash; these are guesses, not a read of
          what you do.
        </p>
      </header>

      <ul className="grid gap-4">
        {drafts.map((d) => {
          const prices = d.products.map((p) => p.price ?? 0).filter(Boolean);
          const low = prices.length ? Math.min(...prices) : 0;
          const high = prices.length ? Math.max(...prices) : 0;
          return (
            <li key={d.slug ?? d.topic} className="card p-4">
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <h2 className="font-semibold capitalize">{d.topic}</h2>
                {low > 0 && (
                  <span className="shrink-0 text-sm text-muted">
                    {rupees(low)}&ndash;{rupees(high)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted">{d.because}</p>

              {d.quote && (
                <p className="mt-3 border-l-2 border-line pl-3 text-sm italic text-muted">
                  &ldquo;{d.quote.length > 140 ? `${d.quote.slice(0, 140)}…` : d.quote}&rdquo;
                </p>
              )}

              <ul className="mt-3 grid gap-1 text-sm">
                {d.products.map((p, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">{p.title}</span>
                    <span className="shrink-0 text-muted">
                      {FORMAT_LABEL[p.format] ?? p.format} · {rupees(p.price ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>

              {d.editToken && (
                <a href={`/edit/${d.editToken}`} className="btn-primary mt-4 w-full">
                  Use this one
                </a>
              )}
            </li>
          );
        })}
      </ul>

      <section className="border-t border-line pt-5">
        <h2 className="font-medium">Is there a different direction you want to explore?</h2>
        <p className="mt-1 text-sm text-muted">
          Tell us what you&rsquo;d actually like to sell and we&rsquo;ll build that instead.
        </p>
        <DifferentDirection />
      </section>
    </div>
  );
}

/** Reuses the normal description path: no new pipeline, no new rules. */
function DifferentDirection() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-device-id': deviceId() },
        body: JSON.stringify({ description: text }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); setBusy(false); return; }
      try { localStorage.setItem(`sf_token_${data.buildId}`, data.editToken); } catch {}
      router.push(`/build/${data.buildId}?t=${data.editToken}`);
    } catch {
      setError('We could not reach the server. Try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-2">
      <textarea
        rows={4} value={text} onChange={(e) => setText(e.target.value)}
        aria-label="A different direction"
        placeholder="I'd like to sell… and it's for people who…"
        className="field"
      />
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{words < 40 ? `About ${40 - words} more words` : 'That’s enough to work with'}</span>
      </div>
      {error && <Notice>{error}</Notice>}
      <button type="submit" className="btn-secondary" disabled={busy || words < 40}>
        {busy ? <Spinner label="Building…" /> : 'Build this instead'}
      </button>
    </form>
  );
}
