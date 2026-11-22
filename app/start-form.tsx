'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import {
  Avatar, GhostBar, MarginNote, Spinner, GHOST_FORMATS, GHOST_NOTES,
  DESCRIBE_EXAMPLE,
} from '@/components/storefront';

/** Stable per-browser id so the rate limit follows the device, not the IP. */
function deviceId(): string {
  try {
    let id = localStorage.getItem('sf_device');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('sf_device', id); }
    return id;
  } catch { return 'no-storage'; }
}

/**
 * Accept what people actually paste: a full profile URL, an @name, or a
 * bare handle. Validated here so an obvious typo never costs a round trip.
 */
export function cleanHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
    .trim();
}

export const HANDLE_RE = /^[a-z0-9._]{1,30}$/i;

const TARGET_WORDS = 40;

/**
 * `empty` mode: the creator's own storefront, before it has anything in
 * it. The handle input sits where their name will appear, and the ghost
 * slots sit where their products will — so pressing the button fills in
 * this same page rather than navigating somewhere new.
 */
export default function StartForm(
  { initialMode = 'handle' }: { initialMode?: 'handle' | 'describe' },
) {
  const router = useRouter();
  const [mode, setMode] = useState<'handle' | 'describe'>(initialMode);
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const words = description.trim() ? description.trim().split(/\s+/).length : 0;
  const remaining = Math.max(0, TARGET_WORDS - words);
  const ready = mode === 'handle'
    ? cleanHandle(handle).length > 0
    : words >= TARGET_WORDS;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    if (mode === 'handle') {
      const h = cleanHandle(handle);
      if (!HANDLE_RE.test(h)) {
        setError('That doesn’t look like an Instagram handle. Use letters, numbers, dots and underscores only.');
        return;
      }
    }

    setBusy(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-device-id': deviceId() },
        body: JSON.stringify(
          mode === 'handle' ? { handle: cleanHandle(handle) } : { description },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Try again.');
        setBusy(false);
        return;
      }
      // The edit token is the only key to this draft; keep it in the URL so
      // the creator can come back to it, and in storage as a backup.
      try { localStorage.setItem(`sf_token_${data.buildId}`, data.editToken); } catch { /* private mode */ }
      router.push(`/build/${data.buildId}?t=${data.editToken}`);
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
      setBusy(false);
    }
  }

  function grow(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  return (
    <form onSubmit={submit}>
      <div className="lg:flex lg:gap-10">
        <div className="lg:w-[480px] lg:flex-initial">
          <Avatar ghost />

          {mode === 'handle' ? (
            <div className="mt-[18px]">
              <label
                htmlFor="handle"
                className="label-caps block text-muted"
              >
                Your Instagram handle
              </label>
              <div className="mt-2 flex items-center border-b-2 border-ink">
                {/* Body face for the "@": Bricolage falls through to a
                    fallback for it and renders a boxed glyph. */}
                <span aria-hidden className="font-sans text-[30px] font-semibold leading-none text-accent">
                  @
                </span>
                <input
                  id="handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                  placeholder="yourhandle"
                  autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  autoComplete="off"
                  className="h-[60px] w-full bg-transparent font-display text-[34px] font-semibold tracking-[-0.03em] text-ink outline-none placeholder:text-placeholder"
                />
              </div>

              {/* Where the bio will land. */}
              <div className="mt-[18px] grid gap-2.5">
                <GhostBar w="92%" />
                <GhostBar w="64%" />
              </div>
            </div>
          ) : (
            <div className="mt-[18px]">
              <label htmlFor="describe" className="label-caps block text-muted">
                What do you teach, and who do you help?
              </label>
              <textarea
                id="describe"
                ref={taRef}
                value={description}
                onChange={(e) => { setDescription(e.target.value); grow(e.target); }}
                rows={3}
                className="mt-2 min-h-[120px] w-full resize-none border-b-2 border-ink bg-transparent py-2 text-[19px] leading-[1.45] text-ink outline-none placeholder:text-placeholder"
                placeholder="I teach…"
              />
              <div className="mt-2 flex items-start justify-between gap-4 text-sm text-muted">
                <span aria-live="polite">
                  {remaining > 0
                    ? `About ${remaining} more word${remaining === 1 ? '' : 's'}`
                    : 'That’s enough to work with'}
                </span>
                <button
                  type="button"
                  className="shrink-0 underline underline-offset-[3px] transition hover:text-ink"
                  onClick={() => {
                    setDescription(DESCRIBE_EXAMPLE);
                    requestAnimationFrame(() => { if (taRef.current) grow(taRef.current); });
                  }}
                >
                  Use an example
                </button>
              </div>
            </div>
          )}
        </div>

        <MarginNote>
          {mode === 'handle'
            ? 'We read your public posts and reels. No login, no password. About 90 seconds.'
            : 'Forty words is enough. Write it the way you would say it out loud.'}
        </MarginNote>
      </div>

      {/* The three product slots, waiting to be filled. */}
      <section className="mt-8 grid gap-3.5" aria-hidden>
        {GHOST_FORMATS.map((f, i) => (
          <div key={f} className="lg:flex lg:gap-10">
            <div
              className="flex min-h-[118px] items-end rounded-card border-[1.5px] border-dashed border-ghost-line p-[18px] lg:w-[480px] lg:flex-initial"
            >
              <div className="flex w-full items-end justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="label-caps text-faint">{f}</div>
                  <div className="mt-2.5"><GhostBar w="70%" h={18} /></div>
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

      {/* Fixed dock */}
      <div className="dock">
        <div className="col-wide">
          {error && (
            <div role="alert" className="notice-error mb-3 animate-fade-up">{error}</div>
          )}
          <button
            type="submit"
            disabled={!ready || busy}
            className={`btn-dock ${
              ready && !busy
                ? 'bg-ink text-white hover:bg-black'
                : 'bg-line text-muted'
            }`}
          >
            {busy ? <><Spinner light /> Starting…</> : 'Build my storefront'}
          </button>
          <p className="mt-3 text-center text-sm text-muted">
            {mode === 'handle' ? (
              <>Private, or not on Instagram?{' '}
                <button type="button" onClick={() => { setMode('describe'); setError(null); }}
                  className="font-medium text-ink underline underline-offset-[3px]">
                  Describe yourself instead
                </button>
              </>
            ) : (
              <>Have a public account?{' '}
                <button type="button" onClick={() => { setMode('handle'); setError(null); }}
                  className="font-medium text-ink underline underline-offset-[3px]">
                  Use your handle
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </form>
  );
}
