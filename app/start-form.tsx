'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Notice, Spinner } from '@/components/ui';

/** Stable per-browser id so the rate limit follows the device, not the IP. */
function deviceId(): string {
  try {
    let id = localStorage.getItem('sf_device');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('sf_device', id); }
    return id;
  } catch { return 'no-storage'; }
}

const EXAMPLE =
  'I teach eggless baking to home cooks. Most of them have no oven, so '
  + 'everything I make works in a cooker or a kadai. I answer a lot of '
  + 'questions about why cakes sink.';

export default function StartForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'handle' | 'describe'>('handle');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = description.trim() ? description.trim().split(/\s+/).length : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-device-id': deviceId() },
        body: JSON.stringify(mode === 'handle' ? { handle } : { description }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong. Try again.'); setBusy(false); return; }
      // The edit token is the only key to this draft; keep it in the URL so
      // the creator can come back to it, and in storage as a backup.
      try { localStorage.setItem(`sf_token_${data.buildId}`, data.editToken); } catch {}
      router.push(`/build/${data.buildId}?t=${data.editToken}`);
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="flex gap-1 rounded-xl border border-line bg-paper p-1" role="tablist">
        {(['handle', 'describe'] as const).map((m) => (
          <button
            key={m} type="button" role="tab" aria-selected={mode === m}
            onClick={() => { setMode(m); setError(null); }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === m ? 'bg-card text-ink shadow-sm' : 'text-muted'}`}
          >
            {m === 'handle' ? 'Instagram handle' : 'Describe yourself'}
          </button>
        ))}
      </div>

      {mode === 'handle' ? (
        <div>
          <label htmlFor="handle" className="mb-1.5 block text-sm font-medium">
            Your public Instagram handle
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-line bg-card
                          px-4 focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10">
            <span aria-hidden className="text-muted">@</span>
            <input
              id="handle" name="handle" value={handle} autoCapitalize="none"
              autoCorrect="off" spellCheck={false} inputMode="text"
              onChange={(e) => setHandle(e.target.value)}
              placeholder="yourname"
              className="w-full bg-transparent py-3 outline-none placeholder:text-muted/60"
            />
          </div>
          <p className="mt-2 text-sm text-muted">
            It has to be public. Private account?{' '}
            <button type="button" className="underline underline-offset-2"
              onClick={() => setMode('describe')}>
              Describe yourself instead
            </button>.
          </p>
        </div>
      ) : (
        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
            What do you teach, and who do you help?
          </label>
          <textarea
            id="description" name="description" rows={5} value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={EXAMPLE}
            className="field"
          />
          <div className="mt-2 flex items-center justify-between text-sm text-muted">
            <span>{words < 40 ? `About ${40 - words} more words` : 'That’s enough to work with'}</span>
            <button type="button" className="underline underline-offset-2"
              onClick={() => setDescription(EXAMPLE)}>
              Use an example
            </button>
          </div>
        </div>
      )}

      {error && <Notice>{error}</Notice>}

      <button type="submit" className="btn-primary w-full"
        disabled={busy || (mode === 'handle' ? !handle.trim() : words < 40)}>
        {busy ? <Spinner label="Starting…" /> : 'Build my storefront'}
      </button>
    </form>
  );
}
