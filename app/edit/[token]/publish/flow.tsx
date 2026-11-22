'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Spinner } from '@/components/storefront';

/**
 * The publish sheet. Three steps: prove the handle is yours (handle-built
 * stores only), confirm, then share.
 *
 * PRD §FR5 — the bio code is the honesty check that stops someone
 * building a page for a creator they do not own.
 */
export default function PublishFlow({
  token, baseUrl, needsCode, handle, name, slug: initialSlug, status,
}: {
  token: string; baseUrl: string; needsCode: boolean;
  handle: string | null; name: string; slug: string | null; status: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(!needsCode);
  const [slug, setSlug] = useState(initialSlug);
  const [published, setPublished] = useState(status === 'published');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'error' | 'info'>('error');
  const [copied, setCopied] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const url = slug
    ? `${baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')}/s/${slug}`
    : '';

  const close = () => router.push(`/edit/${token}`);

  // Escape closes the sheet, and focus starts inside it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function post(action: string) {
    const res = await fetch(`/api/store/${token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  async function copy(text: string, which: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // Instagram's in-app browser blocks the clipboard API.
      window.prompt('Copy this:', text);
    }
  }

  async function getCode() {
    setBusy(true); setMessage(null);
    const { ok, data } = await post('get_code');
    setBusy(false);
    if (ok) setCode(data.code);
    else setMessage(data.error ?? 'We could not create a code. Try again.');
  }

  async function checkCode() {
    setBusy(true); setMessage(null); setMessageTone('error');
    const { ok, data } = await post('check_code');
    setBusy(false);
    if (data.found) { setConfirmed(true); setMessage(null); return; }
    // A 503 means WE could not read the bio. Rendering that identically
    // to "code not found" sends the creator off to re-edit their
    // Instagram bio to fix an outage on our side.
    if (!ok) {
      setMessageTone('info');
      setMessage(data.message ?? 'We could not reach Instagram just now. Try again in a moment.');
      return;
    }
    setMessage(data.message ?? "We couldn't find the code in your bio yet.");
  }

  async function publish() {
    setBusy(true); setMessage(null);
    const { ok, data } = await post('publish');
    setBusy(false);
    if (ok) { setSlug(data.slug); setPublished(true); }
    else setMessage(data.error === 'ownership_required'
      ? 'Add the code to your bio first.'
      : data.error ?? 'We could not publish. Try again.');
  }

  async function unpublish() {
    if (!confirm('Take your page down? The link will stop working until you publish again.')) return;
    setBusy(true); setMessage(null);
    const { ok, data } = await post('unpublish');
    setBusy(false);
    if (!ok) {
      setMessageTone('error');
      setMessage(data.error ?? 'We could not take it down. Try again.');
      return;
    }
    setPublished(false);
  }

  const notice = message && (
    <div
      role="alert"
      className={`mt-4 animate-fade-up rounded-xl border px-4 py-3.5 text-[15px] ${
        messageTone === 'info' ? 'border-line bg-white text-muted' : ''
      }`}
      style={messageTone === 'error'
        ? { background: '#FFF1E8', borderColor: 'rgba(194,65,12,.3)' }
        : undefined}
    >
      {message}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(21,19,15,.5)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={published ? 'Your storefront is live' : `Publish ${name}`}
        className="w-full max-w-[480px] animate-sheet-in bg-paper px-[22px] pb-7 pt-6 outline-none"
        style={{ borderRadius: '28px 28px 0 0' }}
      >
        {published && url ? (
          <>
            <h2 className="font-display text-[40px] font-bold leading-[1] tracking-[-0.035em]">
              It’s live.
            </h2>

            <div className="mt-5 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-xl border border-line bg-white px-4 py-3 font-mono text-sm">
                {url}
              </code>
              <button type="button" onClick={() => copy(url, 'url')}
                className="shrink-0 rounded-full bg-ink px-4 py-3 text-sm font-medium text-white">
                {copied === 'url' ? 'Copied' : 'Copy link'}
              </button>
            </div>

            <p className="mt-5 text-[15px] leading-[1.5] text-muted">
              Put this link in your Instagram bio. Anyone who opens it sees
              your page. They don’t need an account.
            </p>

            <div className="mt-5 flex gap-2.5">
              <a className="flex flex-1 items-center justify-center rounded-full border border-ink text-sm font-medium"
                style={{ minHeight: 48 }}
                href={`https://wa.me/?text=${encodeURIComponent(`Here's my storefront — ${url}`)}`}
                target="_blank" rel="noopener noreferrer">
                Share on WhatsApp
              </a>
              <a className="flex flex-1 items-center justify-center rounded-full border border-ink text-sm font-medium"
                style={{ minHeight: 48 }}
                href={url} target="_blank" rel="noopener noreferrer">
                View it
              </a>
            </div>

            {notice}

            <div className="mt-6 flex justify-between border-t border-line pt-4 text-sm">
              <Link href={`/edit/${token}`} className="text-muted underline underline-offset-[3px] hover:text-ink">
                Keep editing
              </Link>
              <button type="button" onClick={unpublish} disabled={busy}
                className="text-muted underline underline-offset-[3px] hover:text-accent">
                Take it down
              </button>
            </div>
          </>
        ) : needsCode && !confirmed ? (
          <>
            <h2 className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.025em]">
              First, show us @{handle} is yours
            </h2>
            <p className="mt-3 text-[15px] leading-[1.5] text-muted">
              Add this code anywhere in your Instagram bio, save it, then tap
              check. You can remove it straight after.
            </p>

            {code ? (
              <>
                <div className="mt-5 flex items-center gap-2">
                  <code className="flex-1 rounded-xl border border-dashed border-ink bg-white px-4 py-3 text-center font-mono text-[22px] font-semibold tracking-[.2em]">
                    {code}
                  </code>
                  <button type="button" onClick={() => copy(code, 'code')}
                    className="shrink-0 rounded-full border border-ink px-4 py-3 text-sm font-medium">
                    {copied === 'code' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <button type="button" onClick={checkCode} disabled={busy}
                  className="btn-dock mt-4 bg-ink text-white hover:bg-black">
                  {busy ? <><Spinner light /> Checking your bio…</> : 'I’ve added it. Check'}
                </button>
              </>
            ) : (
              <button type="button" onClick={getCode} disabled={busy}
                className="btn-dock mt-5 bg-ink text-white hover:bg-black">
                {busy ? <><Spinner light /> Getting your code…</> : 'Get my code'}
              </button>
            )}

            {notice}

            <button type="button" onClick={close}
              className="mt-4 w-full text-center text-sm text-muted underline underline-offset-[3px] hover:text-ink">
              Back to editing
            </button>
          </>
        ) : (
          <>
            {needsCode && (
              <p className="text-[15px] font-medium text-success">
                ✓ Verified. @{handle} is yours.
              </p>
            )}
            <h2 className="mt-2 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.025em]">
              Publish {name}
            </h2>
            <p className="mt-3 text-[15px] leading-[1.5] text-muted">
              Your page will be public at this link. You can take it down at
              any time.
            </p>
            {slug && (
              <div className="mt-4 break-all rounded-xl border border-line bg-white px-4 py-3 font-mono text-sm">
                {url}
              </div>
            )}
            <button type="button" onClick={publish} disabled={busy}
              className="btn-dock mt-5 bg-accent text-white hover:brightness-95">
              {busy ? <><Spinner light /> Publishing…</> : 'Publish my storefront'}
            </button>

            {notice}

            <button type="button" onClick={close}
              className="mt-4 w-full text-center text-sm text-muted underline underline-offset-[3px] hover:text-ink">
              Back to editing
            </button>
          </>
        )}
      </div>
    </div>
  );
}
