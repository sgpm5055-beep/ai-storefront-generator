'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * The bar the owner sees over their own page in preview.
 *
 * A dot states plainly whether this is public yet, because "preview" and
 * "live" look identical otherwise and the difference matters.
 */
export default function OwnerBar(
  { token, slug, live }: { token: string; slug: string | null; live: boolean },
) {
  const [copied, setCopied] = useState(false);
  const url = slug && typeof window !== 'undefined'
    ? `${window.location.origin}/s/${slug}`
    : slug ? `/s/${slug}` : '';

  return (
    <div className="dock" role="status">
      <div className="col">
        <div className="flex items-center gap-2 rounded-full bg-ink py-2 pl-[18px] pr-2 text-white">
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: live ? '#4ADE80' : '#C4BCB0' }}
          />
          <span className="min-w-0 flex-1 truncate text-sm">
            {live ? url.replace(/^https?:\/\//, '') : 'Preview. Not public yet.'}
          </span>

          {live && url && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                } catch {
                  // Instagram's in-app browser blocks the clipboard API.
                  window.prompt('Copy your link:', url);
                }
              }}
              className="shrink-0 rounded-full border border-white/30 px-3 py-1.5 text-sm transition hover:bg-white/10"
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
          )}

          <Link
            href={`/edit/${token}`}
            className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-ink"
          >
            {live ? 'Edit' : 'Back to editing'}
          </Link>
        </div>
      </div>
    </div>
  );
}
