/** Small shared pieces. Kept deliberately plain: the storefront is the design. */
'use client';

import { useEffect, useRef, useState } from 'react';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[560px] px-4 pb-24 pt-8 sm:pt-14">
      {children}
    </main>
  );
}

/** A visible, non-alarming error. The creator should never see a stack trace. */
export function Notice(
  { tone = 'error', children, action }:
  { tone?: 'error' | 'info'; children: React.ReactNode; action?: React.ReactNode },
) {
  const styles = tone === 'error'
    ? 'border-accent/30 bg-accent-soft text-ink'
    : 'border-line bg-paper text-muted';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {children}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-muted" role="status">
      <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink" />
      {label ? <span className="text-sm">{label}</span> : <span className="sr-only">Working</span>}
    </span>
  );
}

/**
 * Click-to-edit text. Saves on blur, not on every keystroke, so a slow
 * network never fights the creator's typing. Shows its own save state
 * rather than a global one, so two fields can save at once.
 */
export function Editable({
  value, onSave, multiline, className = '', ariaLabel, placeholder,
}: {
  value: string;
  onSave: (v: string) => Promise<string | null>;   // returns an error message, or null
  multiline?: boolean;
  className?: string;
  ariaLabel: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const committed = useRef(value);

  useEffect(() => { setDraft(value); committed.current = value; }, [value]);

  async function commit() {
    const next = draft.trim();
    if (next === committed.current) { setState('idle'); return; }
    setState('saving');
    const err = await onSave(next);
    if (err) {
      setState('error');
      setMessage(err);
      setDraft(committed.current);        // the page never shows unsaved text as saved
    } else {
      committed.current = next;
      setState('saved');
      setMessage(null);
      setTimeout(() => setState('idle'), 1400);
    }
  }

  const Tag = multiline ? 'textarea' : 'input';
  return (
    <div className="group relative">
      <Tag
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={draft}
        rows={multiline ? 4 : undefined}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (!multiline && e.key === 'Enter') (e.target as HTMLElement).blur();
          if (e.key === 'Escape') { setDraft(committed.current); (e.target as HTMLElement).blur(); }
        }}
        className={`w-full resize-none rounded-lg border border-transparent bg-transparent
          px-2 py-1 -mx-2 outline-none hover:border-line focus:border-ink
          focus:bg-card focus:ring-2 focus:ring-ink/10 ${className}`}
      />
      <span className="pointer-events-none absolute -top-5 right-0 text-xs text-muted">
        {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : ''}
      </span>
      {state === 'error' && message
        ? <p role="alert" className="mt-1 text-xs text-accent">{message}</p>
        : null}
    </div>
  );
}

/** Copy-to-clipboard that degrades to select-all when the API is blocked. */
export function CopyButton(
  { text, label = 'Copy link', className = 'btn-secondary' }:
  { text: string; label?: string; className?: string },
) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Instagram's in-app browser blocks the clipboard API.
          window.prompt('Copy this link', text);
          return;
        }
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}
    >
      {done ? 'Copied' : label}
    </button>
  );
}

// Lives in lib/format.ts so server components can use it too; re-exported
// here for the client components that already import it from this module.
export { rupees } from '@/lib/format';
