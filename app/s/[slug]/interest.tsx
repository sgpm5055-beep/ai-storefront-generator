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
      className="btn-secondary w-full"
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
      {done ? 'We’ll let them know' : 'Notify me when this opens'}
    </button>
  );
}
