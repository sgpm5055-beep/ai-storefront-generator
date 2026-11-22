'use client';

import { useState } from 'react';

/**
 * Pre-launch stores have no checkout. "Notify me" records interest as an
 * event, which is the honest version of a buy button that does nothing.
 */
export default function Interest({ storeId, productId }: { storeId: string; productId: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`flex-1 rounded-full border text-base font-medium transition ${
        done
          ? 'border-line bg-paper text-muted'
          : 'border-ink bg-white text-ink hover:bg-paper active:scale-[.99]'
      }`}
      style={{ minHeight: 52 }}
      disabled={done}
      onClick={async () => {
        setDone(true);
        try {
          await fetch('/api/interest', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ storeId, productId }),
          });
        } catch { /* interest is best-effort; never block the page on it */ }
      }}
    >
      {done ? '✓ We’ll let you know' : 'Notify me'}
    </button>
  );
}
