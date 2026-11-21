'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Editable, Notice, Spinner, rupees } from '@/components/ui';
import type { StoreRow, ProductRow } from '@/lib/store';

const FORMAT_LABEL: Record<string, string> = {
  digital: 'Download', webinar: 'Live workshop',
  session: '1:1 session', course: 'Course',
};

export default function Editor(
  { token, store, products: initial }:
  { token: string; store: StoreRow; products: ProductRow[] },
) {
  const [products, setProducts] = useState(initial);
  const [bio, setBio] = useState(store.bio ?? '');
  const [name, setName] = useState(store.name ?? '');
  const [banner, setBanner] = useState<string | null>(null);

  // The pipeline uses "Creator" when a description gives no name. Asking
  // beats guessing: this becomes the page title and the public URL.
  const namePlaceholder = !name.trim() || name.trim().toLowerCase() === 'creator';

  async function saveField(
    field: string, value: string | number | string[], productId?: string,
  ): Promise<string | null> {
    const res = await fetch(`/api/store/${token}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ field, value, productId }),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.error ?? 'We could not save that. Try again.';
  }

  return (
    <div className="grid gap-7">
      <header>
        <p className="text-sm text-muted">Draft — nothing is public yet</p>
        <h1 className="mt-1 text-2xl font-semibold">Check it over, change anything.</h1>
        <p className="mt-1 text-sm text-muted">
          Tap any text to edit it. Changes save as you go.
        </p>
      </header>

      {store.validation_result === 'template' && (
        <Notice tone="info">
          We didn&rsquo;t find much to go on, so this is a starting point rather
          than a read of your account. Worth rewriting in your own words.
        </Notice>
      )}

      {banner && <Notice>{banner}</Notice>}

      {/* Bio */}
      <section className="card p-4">
        <div className="mb-2 flex items-center gap-3">
          {store.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.avatar_url} alt="" width={44} height={44}
              className="h-11 w-11 rounded-full object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <Editable
              ariaLabel="Your name"
              value={namePlaceholder ? '' : name}
              placeholder="Your name"
              className="font-semibold"
              onSave={async (v) => {
                const e = await saveField('name', v);
                if (!e) setName(v);
                return e;
              }}
            />
            {store.handle && <p className="px-2 -mx-2 text-sm text-muted">@{store.handle}</p>}
          </div>
        </div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
          Bio
        </label>
        <Editable
          ariaLabel="Your bio" value={bio} multiline
          onSave={async (v) => { const e = await saveField('bio', v); if (!e) setBio(v); return e; }}
        />
      </section>

      {/* Products */}
      <section className="grid gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
          {products.length} things you could sell
        </h2>
        {products.map((p) => (
          <ProductCard
            key={p.id} product={p} token={token}
            onSave={saveField}
            onReplace={(next) => setProducts((ps) =>
              ps.map((x) => (x.id === next.id ? next : x)))}
            onError={setBanner}
          />
        ))}
      </section>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 pt-3 backdrop-blur"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {namePlaceholder ? (
          <>
            <p className="mb-2 text-center text-sm text-muted">
              Add your name above — it becomes your page&rsquo;s title and link.
            </p>
            <button type="button" disabled className="btn-primary w-full">
              Looks good — publish it
            </button>
          </>
        ) : (
          <Link href={`/edit/${token}/publish`} className="btn-primary w-full">
            Looks good — publish it
          </Link>
        )}
      </div>
    </div>
  );
}

function ProductCard({
  product, token, onSave, onReplace, onError,
}: {
  product: ProductRow;
  token: string;
  onSave: (f: string, v: string | number | string[], id?: string) => Promise<string | null>;
  onReplace: (p: ProductRow) => void;
  onError: (m: string | null) => void;
}) {
  const [p, setP] = useState(product);
  const [why, setWhy] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [capped, setCapped] = useState(false);

  async function tryAnother() {
    setRegenerating(true);
    onError(null);
    try {
      const res = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, productId: p.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error ?? 'We could not swap that one.');
        if (data.capped) setCapped(true);
        return;
      }
      const next = {
        ...p,
        title: data.product.title, promise: data.product.promise,
        description: data.product.description, points: data.product.points,
        price: data.product.price, price_reason: data.product.priceReason,
      };
      setP(next);
      onReplace(next);
    } catch {
      onError('We could not reach the server. Try again.');
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <article className="card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="chip">{FORMAT_LABEL[p.format] ?? p.format}</span>
        <PriceChip product={p} onSave={onSave} onError={onError} />
      </div>

      <Editable
        ariaLabel="Product title" value={p.title ?? ''} className="text-lg font-semibold"
        onSave={(v) => onSave('title', v, p.id)}
      />
      <Editable
        ariaLabel="What it promises" value={p.promise ?? ''} multiline rows={2}
        className="text-muted"
        onSave={(v) => onSave('promise', v, p.id)}
      />
      <div className="mt-3">
        <Editable
          ariaLabel="Description" value={p.description ?? ''} multiline className="text-sm"
          onSave={(v) => onSave('description', v, p.id)}
        />
      </div>

      {p.points && p.points.length > 0 && (
        <ul className="mt-3 grid gap-1 text-sm text-muted">
          {p.points.map((pt, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="text-line">—</span>{pt}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <button type="button" onClick={() => setWhy((w) => !w)}
          aria-expanded={why}
          className="min-h-[44px] py-2 text-sm text-muted underline underline-offset-2 hover:text-ink">
          Why this?
        </button>
        <button type="button" onClick={tryAnother} disabled={regenerating || capped}
          className="min-h-[44px] py-2 text-sm text-muted underline underline-offset-2
                     hover:text-ink disabled:no-underline disabled:opacity-50">
          {regenerating ? <Spinner label="Finding another…" /> : 'Try another'}
        </button>
      </div>

      {why && (
        <div className="mt-3 rounded-xl bg-paper p-3 text-sm text-muted">
          {p.demand_item && <p><strong className="text-ink">They ask you:</strong> {p.demand_item}</p>}
          {p.evidence && <p className="mt-2 italic">&ldquo;{p.evidence}&rdquo;</p>}
          {p.price_reason && (
            <p className="mt-2"><strong className="text-ink">Price:</strong> {p.price_reason}</p>
          )}
          {!p.demand_item && !p.evidence && (
            <p>Drawn from what you told us about your work.</p>
          )}
        </div>
      )}
    </article>
  );
}

/** Price is a number field, not free text, and shows its reason on tap. */
function PriceChip({
  product, onSave, onError,
}: {
  product: ProductRow;
  onSave: (f: string, v: string | number | string[], id?: string) => Promise<string | null>;
  onError: (m: string | null) => void;
}) {
  const [price, setPrice] = useState(product.price ?? 0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(String(product.price ?? 0));

  async function commit() {
    const n = Math.max(0, Math.round(Number(draft) || 0));
    if (n === price) { setEditing(false); return; }
    // Await before closing: this used to revert the price silently when
    // the save failed, with no message shown anywhere on the page.
    setSaving(true);
    const err = await onSave('price', n, product.id);
    setSaving(false);
    setEditing(false);
    if (err) {
      setDraft(String(price));
      onError(err);
    } else {
      setPrice(n);
      onError(null);
    }
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-ink bg-card px-3 py-1">
        <span aria-hidden>₹</span>
        <input
          autoFocus type="number" inputMode="numeric" min={0} max={100000} value={draft}
          disabled={saving}
          aria-label="Price in rupees"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLElement).blur(); }}
          className="w-20 bg-transparent outline-none"
        />
      </span>
    );
  }

  return (
    <button type="button" onClick={() => { setDraft(String(price)); setEditing(true); }}
      className="chip font-medium text-ink hover:border-ink"
      title={product.price_reason ?? undefined}>
      {rupees(price)}
    </button>
  );
}
