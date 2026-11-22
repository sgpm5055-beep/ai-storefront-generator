'use client';

import { useEffect, useRef, useState } from 'react';
import { firstName, rupees } from '@/lib/format';
import { useRouter } from 'next/navigation';
import {
  Avatar, GhostBar, MarginNote, Spinner, GHOST_FORMATS, GHOST_NOTES,
} from '@/components/storefront';

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
          if (!t) { try { t = localStorage.getItem(`sf_token_${id}`) ?? ''; } catch { /* private mode */ } }
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

  // Skipped stages are hidden rather than counted: a creator who typed a
  // description should not be told they are on step 4 of 9.
  const visible = STEPS.filter((s) => statusOf(s.key) !== 'skipped');
  const doneCount = visible.filter((s) => statusOf(s.key) === 'done').length;
  const running = visible.find((s) => statusOf(s.key) === 'running');
  const lastDone = [...visible].reverse().find((s) => statusOf(s.key) === 'done');
  const lastDetail = lastDone
    ? job?.stages.find((s) => s.stage === lastDone.key)?.detail ?? null
    : null;

  const greeting = firstName(job?.name);
  const profileFound = statusOf('scrape_profile') === 'done';

  // ---- directions -------------------------------------------------
  if (job?.status === 'directions') {
    return job.drafts?.length
      ? <Chooser job={job} drafts={job.drafts} />
      : (
        // Without this the component falls through to the step list,
        // which has already stopped polling: a frozen screen forever.
        <>
          <h1 className="font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.03em]">
            We couldn’t find an angle for this one.
          </h1>
          <p className="mt-4 text-[17px] leading-[1.5] text-muted">
            We read your posts but couldn’t work out what you could sell.
            Tell us in your own words and we’ll build from that.
          </p>
          <div className="dock">
            <div className="col">
              <a href="/?mode=describe" className="btn-dock bg-ink text-white hover:bg-black">
                Describe yourself instead
              </a>
            </div>
          </div>
        </>
      );
  }

  // ---- lost token -------------------------------------------------
  if (lostToken) {
    return (
      <>
        <h1 className="font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.03em]">
          Your storefront is ready.
        </h1>
        <div role="alert" className="notice-error mt-5">
          We lost the private link to this draft in your browser. Open the
          original link you were sent, or start again — nothing you typed is lost.
        </div>
        <p className="mt-4 text-sm text-muted">
          Build reference: <code className="font-mono">{id}</code>
        </p>
        <div className="dock">
          <div className="col-wide">
            <a href="/" className="btn-dock bg-ink text-white hover:bg-black">Start again</a>
          </div>
        </div>
      </>
    );
  }

  // ---- failed -----------------------------------------------------
  if (job?.status === 'failed' || dead) {
    return (
      <>
        <StoreHeader job={job} profileFound={profileFound} note={null} />
        <GhostSlots pulse={false} />
        <div className="dock">
          <div className="col-wide">
            {/* If the scrape identified them before stopping, say so.
                "We found you, but couldn't finish" is a different message
                from "it broke". */}
            <div
              role="alert"
              className="rounded-dock border bg-accent-soft p-[18px]"
              style={{ borderColor: 'rgba(194,65,12,.3)' }}
            >
              <p className="font-semibold">
                {greeting
                  ? `We found you, ${greeting}, but couldn’t finish.`
                  : 'We couldn’t finish this one.'}
              </p>
              <p className="mt-1.5 text-[15px] leading-[1.5] text-muted">
                {dead ?? job?.error ?? 'Something went wrong.'}
              </p>
              <div className="mt-4 flex gap-2.5">
                <a href="/"
                  className="flex flex-1 items-center justify-center rounded-full bg-ink text-base font-medium text-white"
                  style={{ minHeight: 52 }}>
                  Try again
                </a>
                <a href="/?mode=describe"
                  className="flex flex-1 items-center justify-center rounded-full border border-ink text-base font-medium text-ink"
                  style={{ minHeight: 52 }}>
                  Describe instead
                </a>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ---- building ---------------------------------------------------
  return (
    <>
      <StoreHeader
        job={job}
        profileFound={profileFound}
        note={lastDetail ?? 'Starting. You can keep this tab open.'}
      />
      <GhostSlots pulse />

      <div className="dock">
        <div className="col-wide">
          {tooLong && (
            <div role="status" className="notice-error mb-3 animate-fade-up">
              This is taking longer than usual. It’s still running — you can keep waiting.
            </div>
          )}
          <div className="rounded-dock bg-ink px-[18px] pb-4 pt-3.5 text-white" role="status">
            <div className="flex items-center gap-3">
              <Spinner light />
              <span className="min-w-0 flex-1 truncate font-medium">
                {running?.label ?? 'Starting'}
              </span>
              <span className="shrink-0 font-mono text-sm text-placeholder">
                {doneCount} / {visible.length}
              </span>
            </div>
            {lastDetail && (
              <p className="mt-1.5 truncate text-sm text-placeholder">{lastDetail}</p>
            )}
            <div
              className="mt-3 h-[3px] overflow-hidden rounded-full"
              style={{ background: 'rgba(255,255,255,.15)' }}
            >
              <div
                className="h-full bg-white"
                style={{
                  width: `${visible.length ? (doneCount / visible.length) * 100 : 0}%`,
                  transition: 'width .8s cubic-bezier(.3,.7,.2,1)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Header shared by the building and failed states. */
function StoreHeader(
  { job, profileFound, note }:
  { job: Job | null; profileFound: boolean; note: string | null },
) {
  return (
    <div className="lg:flex lg:gap-10">
      <div className="lg:w-[480px] lg:flex-initial">
        {profileFound
          ? <Avatar url={job?.avatarUrl} name={job?.name} />
          : <Avatar ghost />}

        {profileFound && job?.name ? (
          <h1 className="mt-[18px] animate-fade-up font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.03em]">
            {job.name}
          </h1>
        ) : (
          <div className="mt-[18px]"><GhostBar w="180px" h={26} pulse /></div>
        )}

        {profileFound && job?.handle && (
          <p className="mt-1 text-[15px] text-muted">@{job.handle}</p>
        )}

        <div className="mt-[18px] grid gap-2.5">
          <GhostBar w="92%" pulse />
          <GhostBar w="64%" pulse />
        </div>
      </div>
      <MarginNote>{note}</MarginNote>
    </div>
  );
}

function GhostSlots({ pulse }: { pulse: boolean }) {
  return (
    <section className="mt-8 grid gap-3.5" aria-hidden>
      {GHOST_FORMATS.map((f, i) => (
        <div key={f} className="lg:flex lg:gap-10">
          <div className="flex min-h-[118px] items-end rounded-card border-[1.5px] border-dashed border-ghost-line p-[18px] lg:w-[480px] lg:flex-initial">
            <div className="flex w-full items-end justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="label-caps text-faint">{f}</div>
                <div className="mt-2.5"><GhostBar w="70%" h={18} pulse={pulse} /></div>
              </div>
              <span className="font-display text-2xl font-bold text-ghost-line">₹</span>
            </div>
          </div>
          <aside className="mt-[18px] hidden border-t border-ghost-line pt-2.5 text-[13px] leading-[1.5] text-muted lg:block lg:w-[240px] lg:flex-none">
            {GHOST_NOTES[i]}
          </aside>
        </div>
      ))}
    </section>
  );
}

/**
 * A substantive creator who teaches nothing gets directions to choose
 * between, shown as guesses rather than as a read of what they do.
 */
function Chooser({ job, drafts }: { job: Job; drafts: Draft[] }) {
  const greeting = firstName(job.name);
  return (
    <>
      <Avatar url={job.avatarUrl} name={job.name} />
      <h1 className="mt-[18px] font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.03em]">
        {greeting ? `${greeting}, pick a direction.` : 'Pick a direction.'}
      </h1>
      <p className="mt-4 text-[17px] leading-[1.5] text-muted">
        You don’t teach a skill directly, so we didn’t invent one. Here are
        directions drawn from your own posts. These are guesses, not a read
        of what you do.
      </p>

      <section className="mt-8 grid gap-3.5">
        {drafts.map((d) => {
          const prices = d.products
            .map((p) => p.price).filter((n): n is number => typeof n === 'number');
          const range = prices.length
            ? `${rupees(Math.min(...prices))}–${rupees(Math.max(...prices))}`
            : '';
          const href = d.editToken ? `/edit/${d.editToken}` : null;
          const inner = (
            <>
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-display text-[22px] font-semibold leading-[1.15] tracking-[-0.02em]">
                  {d.topic}
                </h2>
                {range && <span className="tnum shrink-0 text-sm text-muted">{range}</span>}
              </div>
              <p className="mt-2 text-sm leading-[1.5] text-muted">{d.because}</p>
              {d.quote && (
                <blockquote className="mt-3 border-l-2 border-accent pl-3 text-[15px] italic leading-[1.5] text-muted">
                  {d.quote}
                </blockquote>
              )}
              <p className="mt-4 text-[15px] font-medium text-ink">Build this one →</p>
            </>
          );
          return href ? (
            <a key={d.slug ?? d.topic} href={href}
              className="block rounded-card border border-line bg-card p-[18px] text-left transition hover:border-ink">
              {inner}
            </a>
          ) : (
            <div key={d.topic} className="rounded-card border border-line bg-card p-[18px]">
              {inner}
            </div>
          );
        })}
      </section>

      <div className="dock">
        <div className="col-wide">
          <a href="/?mode=describe"
            className="btn-dock border border-ink bg-transparent text-ink hover:bg-white">
            None of these. Let me describe it
          </a>
        </div>
      </div>
    </>
  );
}
