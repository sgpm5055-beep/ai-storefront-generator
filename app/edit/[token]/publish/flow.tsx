'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CopyButton, Notice, Spinner } from '@/components/ui';

/**
 * Two steps: prove the handle is yours (only for handle-built stores),
 * then publish. PRD §FR5 — the bio code is the honesty check that stops
 * someone building a page for a creator they do not own.
 */
export default function PublishFlow({
  token, baseUrl, needsCode, handle, name, slug: initialSlug, status,
}: {
  token: string; baseUrl: string; needsCode: boolean;
  handle: string | null; name: string; slug: string | null; status: string;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(!needsCode);
  const [slug, setSlug] = useState(initialSlug);
  const [published, setPublished] = useState(status === 'published');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const url = slug ? `${baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')}/s/${slug}` : '';

  async function post(action: string) {
    const res = await fetch(`/api/store/${token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  async function getCode() {
    setBusy(true); setMessage(null);
    const { ok, data } = await post('get_code');
    setBusy(false);
    if (ok) setCode(data.code);
    else setMessage(data.error ?? 'We could not create a code. Try again.');
  }

  async function checkCode() {
    setBusy(true); setMessage(null);
    const { data } = await post('check_code');
    setBusy(false);
    if (data.found) { setConfirmed(true); setMessage(null); }
    else setMessage(data.message ?? 'Not found yet.');
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
    setBusy(true);
    await post('unpublish');
    setBusy(false);
    setPublished(false);
  }

  if (published && url) {
    const share = `Here's my storefront — ${url}`;
    return (
      <div className="grid gap-5">
        <h1 className="text-2xl font-semibold">It&rsquo;s live.</h1>
        <div className="card break-all p-4 font-mono text-sm">{url}</div>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={url} className="btn-primary" />
          <a className="btn-secondary"
            href={`https://wa.me/?text=${encodeURIComponent(share)}`}
            target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
          <a className="btn-secondary" href={url} target="_blank" rel="noopener noreferrer">
            View it
          </a>
        </div>
        <p className="text-sm text-muted">
          Put this link in your Instagram bio. Anyone who opens it sees your
          page — they don&rsquo;t need an account.
        </p>
        <div className="flex gap-3 border-t border-line pt-4">
          <Link href={`/edit/${token}`} className="btn-ghost">Keep editing</Link>
          <button type="button" onClick={unpublish} disabled={busy} className="btn-ghost">
            Take it down
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <header>
        <Link href={`/edit/${token}`} className="text-sm text-muted underline underline-offset-2">
          ← Back to editing
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Publish {name}</h1>
      </header>

      {needsCode && !confirmed && (
        <section className="card grid gap-3 p-4">
          <h2 className="font-medium">First, show us @{handle} is yours</h2>
          <p className="text-sm text-muted">
            Add this code anywhere in your Instagram bio, save it, then tap
            check. You can remove it straight after.
          </p>
          {code ? (
            <>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-xl bg-paper px-4 py-3 text-center
                                 text-lg font-semibold tracking-widest">{code}</code>
                <CopyButton text={code} label="Copy" />
              </div>
              <button type="button" onClick={checkCode} disabled={busy} className="btn-primary">
                {busy ? <Spinner label="Checking your bio…" /> : "I've added it — check"}
              </button>
            </>
          ) : (
            <button type="button" onClick={getCode} disabled={busy} className="btn-secondary">
              {busy ? <Spinner /> : 'Get my code'}
            </button>
          )}
          {message && <Notice>{message}</Notice>}
        </section>
      )}

      {confirmed && (
        <section className="grid gap-3">
          {needsCode && (
            <p className="text-sm text-ink">✓ Verified — @{handle} is yours.</p>
          )}
          <p className="text-muted">
            Your page will be public at a link you can share anywhere. You can
            take it down at any time.
          </p>
          <button type="button" onClick={publish} disabled={busy} className="btn-primary w-full">
            {busy ? <Spinner label="Publishing…" /> : 'Publish my storefront'}
          </button>
          {message && <Notice>{message}</Notice>}
        </section>
      )}
    </div>
  );
}
