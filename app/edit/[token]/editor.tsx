'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { rupees } from '@/lib/format';
import { PRICE_POINTS } from '@/lib/pricing';
import { coverFor, FORMAT_LABEL, Avatar, Spinner } from '@/components/storefront';
import type { StoreRow, ProductRow } from '@/lib/store';

const BIO_MAX = 150;
const TITLE_MAX = 60;
const PROMISE_MAX = 90;

/**
 * `edit` mode: the creator's own storefront, editable in place.
 *
 * There is no separate editor layout — the page they are editing is the
 * page buyers will see, with dashed affordances on anything changeable.
 */
export default function Editor(
  { token, store, products: initial }:
  { token: string; store: StoreRow; products: ProductRow[] },
) {
  const router = useRouter();
  const [products, setProducts] = useState(initial);
  const [bio, setBio] = useState(store.bio ?? '');
  const [name, setName] = useState(store.name ?? '');
  const [banner, setBanner] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // The pipeline uses "Creator" when a description gives no name. Asking
  // beats guessing: this becomes the page title and the public URL.
  const nameMissing = !name.trim() || name.trim().toLowerCase() === 'creator';

  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  async function saveField(
    field: string, value: string | number | string[], productId?: string,
  ): Promise<string | null> {
    const res = await fetch(`/api/store/${token}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ field, value, productId }),
    });
    if (res.ok) { setBanner(null); flashSaved(); return null; }
    const data = await res.json().catch(() => ({}));
    const msg = data.error ?? 'We could not save that. Try again.';
    setBanner(msg);
    return msg;
  }

  return (
    <>
      {/* Status + preview live in the top bar area of this column. */}
      <div className="col -mt-[52px] mb-5 flex h-[36px] items-center justify-end gap-3">
        <span className="text-sm text-muted" aria-live="polite">
          {saved ? 'Saved' : 'Draft'}
        </span>
        <button
          type="button"
          onClick={() => router.push(`/edit/${token}?preview=1`)}
          className="pill text-ink hover:bg-white"
        >
          Preview
        </button>
      </div>

      {store.validation_result === 'template' && (
        <div role="status" className="notice-error mb-5">
          We didn’t find much to go on, so this is a starting point rather
          than a read of your account. Worth rewriting in your own words.
        </div>
      )}

      {banner && <div role="alert" className="notice-error mb-5 animate-fade-up">{banner}</div>}

      {/* ---- store header ---- */}
      <header className="lg:flex lg:gap-10">
        <div className="lg:w-[480px] lg:flex-initial">
          <Avatar url={store.avatar_url} name={name} />

          <div className="mt-[18px]">
            <AutoGrow
              ariaLabel="Your name"
              value={nameMissing ? '' : name}
              placeholder="Your name"
              singleLine
              className="editable w-full resize-none bg-transparent font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink placeholder:text-placeholder"
              onCommit={async (v) => { const e = await saveField('name', v); if (!e) setName(v); return !e; }}
            />
          </div>

          {store.handle && (
            <p className="mt-1 text-[15px] text-muted">@{store.handle}</p>
          )}

          <div className="mt-[18px]">
            <AutoGrow
              ariaLabel="Your bio"
              value={bio}
              placeholder="A line about what you teach"
              maxLength={BIO_MAX}
              className="editable w-full resize-none bg-transparent text-[17px] leading-[1.5] text-muted placeholder:text-placeholder"
              onCommit={async (v) => { const e = await saveField('bio', v); if (!e) setBio(v); return !e; }}
            />
            <p
              className={`mt-1 text-right text-xs ${bio.length >= BIO_MAX ? 'text-accent' : 'text-faint'}`}
              aria-live="polite"
            >
              {bio.length} / {BIO_MAX}
              {bio.length >= BIO_MAX && ' — that’s the limit'}
            </p>
          </div>
        </div>

        <aside className="mt-[26px] hidden border-t border-ink pt-2.5 text-[13px] leading-[1.5] text-muted lg:block lg:w-[240px] lg:flex-none">
          This is the page buyers will see. Tap any text to change it.
          Nothing is public until you publish.
        </aside>
      </header>

      {/* ---- products ---- */}
      <section className="mt-8 grid gap-3.5">
        {products.map((p, i) => (
          <ProductCard
            key={p.id}
            product={p}
            position={i}
            token={token}
            canRemove={products.length > 2}
            onSave={saveField}
            onReplace={(next) => setProducts((cur) =>
              cur.map((x) => (x.id === next.id ? next : x)))}
            onError={setBanner}
          />
        ))}
      </section>

      {/* ---- dock ---- */}
      <div className="dock">
        <div className="col-wide">
          {nameMissing && (
            <p className="mb-3 text-center text-sm text-muted">
              Add your name at the top. It becomes your page’s title and link.
            </p>
          )}
          <button
            type="button"
            disabled={nameMissing || !!banner}
            onClick={() => router.push(`/edit/${token}/publish`)}
            className={`btn-dock ${
              nameMissing || banner
                ? 'bg-line text-muted'
                : 'bg-accent text-white hover:brightness-95'
            }`}
          >
            Publish
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * A textarea that grows with its content and commits on blur.
 *
 * Commit-on-blur with a revert on failure is the existing Editable
 * behaviour and the reason an unsaved edit is never shown as saved.
 */
function AutoGrow({
  value, onCommit, ariaLabel, placeholder, className, maxLength, singleLine, style,
}: {
  value: string;
  /** Resolve false to reject the edit and put the old text back. */
  onCommit: (v: string) => Promise<boolean | void> | boolean | void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  singleLine?: boolean;
  style?: React.CSSProperties;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);

  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  // Runs on mount as well as on edit: with rows={1} the field would
  // otherwise paint one line tall and clip the text mid-word until the
  // creator touched it.
  useEffect(() => { if (ref.current) grow(ref.current); }, [draft]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    grow(el);
    // Fonts load after first paint and change the wrap height.
    document.fonts?.ready.then(() => grow(el)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <textarea
      ref={ref}
      rows={1}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={className}
      style={style}
      maxLength={maxLength}
      value={draft}
      onChange={(e) => {
        const v = singleLine ? e.target.value.replace(/\n/g, '') : e.target.value;
        setDraft(v);
      }}
      onKeyDown={(e) => {
        if (singleLine && e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); }
      }}
      onBlur={async () => {
        const next = draft.trim();
        if (next === value) return;
        // Revert when the save is refused. Leaving the rejected text in
        // place shows it as if it had saved, which is how a creator ends
        // up believing a blocked claim is live on their page.
        const okSave = await onCommit(next);
        if (okSave === false) setDraft(value);
      }}
    />
  );
}

function ProductCard({
  product, position, token, canRemove, onSave, onReplace, onError,
}: {
  product: ProductRow;
  position: number;
  token: string;
  canRemove: boolean;
  onSave: (f: string, v: string | number | string[], id?: string) => Promise<string | null>;
  onReplace: (p: ProductRow) => void;
  onError: (m: string | null) => void;
}) {
  const [p, setP] = useState(product);
  const [panel, setPanel] = useState<'why' | 'link' | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [capped, setCapped] = useState(false);
  const [bg, fg] = coverFor(position);

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
    <article
      className={`overflow-hidden rounded-card border border-line bg-card transition ${
        regenerating ? 'pointer-events-none opacity-45' : ''
      }`}
    >
      {/* Cover */}
      <div className="grid gap-[22px] p-[18px]" style={{ background: bg }}>
        <span className="label-caps" style={{ color: fg }}>
          {FORMAT_LABEL[p.format] ?? p.format}
        </span>
        <AutoGrow
          ariaLabel="Product title"
          value={p.title ?? ''}
          placeholder="Name this product"
          maxLength={TITLE_MAX}
          singleLine
          className="editable w-full resize-none bg-transparent font-display text-[26px] font-semibold leading-[1.1] tracking-[-0.025em] outline-none"
          style={{ color: fg, borderColor: fg }}
          onCommit={async (v) => { const e = await onSave('title', v, p.id); if (!e) setP({ ...p, title: v }); return !e; }}
        />
      </div>

      {/* Body */}
      <div className="p-[18px] pt-4">
        <AutoGrow
          ariaLabel="What it promises"
          value={p.promise ?? ''}
          placeholder="What does the buyer get?"
          maxLength={PROMISE_MAX}
          className="editable w-full resize-none bg-transparent text-[17px] text-ink placeholder:text-placeholder"
          onCommit={async (v) => { const e = await onSave('promise', v, p.id); if (!e) setP({ ...p, promise: v }); return !e; }}
        />
        <div className="mt-2">
          <AutoGrow
            ariaLabel="Description"
            value={p.description ?? ''}
            placeholder="Describe it in a few lines"
            className="editable w-full resize-none bg-transparent text-[15px] leading-[1.6] text-muted placeholder:text-placeholder"
            onCommit={async (v) => { const e = await onSave('description', v, p.id); if (!e) setP({ ...p, description: v }); return !e; }}
          />
        </div>

        {p.points && p.points.length > 0 && (
          <ul className="mt-3 grid gap-1.5 text-[15px]">
            {p.points.map((pt, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-ghost-line">—</span>{pt}
              </li>
            ))}
          </ul>
        )}
      </div>

      <PriceStrip product={p} onSave={onSave} onError={onError}
        onPrice={(n) => setP({ ...p, price: n })} />

      {/* Actions */}
      <div className="flex items-center gap-1 border-t border-line px-[18px] py-0.5">
        <TrayButton onClick={() => setPanel(panel === 'why' ? null : 'why')}
          expanded={panel === 'why'}>
          Why this?
        </TrayButton>
        <TrayButton onClick={tryAnother} disabled={regenerating || capped} hidden={capped}>
          {regenerating ? <><Spinner /> Finding another…</> : 'Try another'}
        </TrayButton>
        <span className="flex-1" />
        <TrayButton onClick={() => setPanel(panel === 'link' ? null : 'link')}
          expanded={panel === 'link'}
          className={p.checkout_link ? 'text-success' : undefined}>
          {p.checkout_link ? '✓ Payment link added' : '+ Payment link'}
        </TrayButton>
      </div>

      {panel === 'why' && (
        <div className="animate-fade-up border-t border-line px-[18px] pb-[18px] pt-3.5 text-[15px]">
          {p.demand_item
            ? <p><strong>They ask you:</strong> {p.demand_item}</p>
            : <p className="text-muted">Drawn from what you told us about your work.</p>}
          {p.evidence && (
            <blockquote className="mt-2 border-l-2 border-accent pl-3 italic text-muted">
              {p.evidence}
            </blockquote>
          )}
        </div>
      )}

      {panel === 'link' && (
        <div className="animate-fade-up border-t border-line px-[18px] pb-[18px] pt-3.5">
          <p className="text-[15px] text-muted">
            Paste a UPI or checkout link and buyers can pay today. Leave it
            empty and they see “Notify me”.
          </p>
          <input
            type="url"
            defaultValue={p.checkout_link ?? ''}
            aria-label="Payment or checkout link"
            placeholder="https://"
            className="mt-3 w-full rounded-xl border border-line bg-white px-3 text-base outline-none focus:border-ink"
            style={{ minHeight: 48 }}
            onBlur={async (e) => {
              const v = e.target.value.trim();
              if (v === (p.checkout_link ?? '')) return;
              const err = await onSave('checkout_link', v, p.id);
              if (!err) setP({ ...p, checkout_link: v || null });
            }}
          />
        </div>
      )}
    </article>
  );
}

function TrayButton({
  children, onClick, disabled, expanded, hidden, className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  expanded?: boolean;
  hidden?: boolean;
  className?: string;
}) {
  if (hidden) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={expanded}
      className={`inline-flex items-center gap-2 px-1 text-sm text-muted transition hover:text-ink disabled:opacity-50 ${className ?? ''}`}
      style={{ minHeight: 44 }}
    >
      {children}
    </button>
  );
}

/**
 * Price is a number field with step buttons along the real price ladder,
 * plus the reason it was chosen. Hints never block a creator's own price.
 */
function PriceStrip({
  product, onSave, onError, onPrice,
}: {
  product: ProductRow;
  onSave: (f: string, v: string | number | string[], id?: string) => Promise<string | null>;
  onError: (m: string | null) => void;
  onPrice: (n: number) => void;
}) {
  const suggested = product.suggested_price ?? product.price ?? 0;
  const [price, setPrice] = useState(product.price ?? 0);
  const [draft, setDraft] = useState(String(product.price ?? 0));

  async function commit(n: number) {
    const clean = Math.max(0, Math.min(100000, Math.round(n || 0)));
    if (clean === price) { setDraft(String(price)); return; }
    // Await before settling: this used to revert the price silently when
    // the save failed, with no message shown anywhere on the page.
    const err = await onSave('price', clean, product.id);
    if (err) { setDraft(String(price)); onError(err); return; }
    setPrice(clean);
    setDraft(String(clean));
    onPrice(clean);
  }

  const step = (dir: 1 | -1) => {
    const idx = PRICE_POINTS.findIndex((v) => v >= price);
    const at = idx === -1 ? PRICE_POINTS.length - 1 : idx;
    const next = PRICE_POINTS[Math.max(0, Math.min(PRICE_POINTS.length - 1, at + dir))];
    void commit(next);
  };

  const changed = price !== suggested;

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-line bg-paper px-[18px] py-3.5">
      <button type="button" onClick={() => step(-1)} aria-label="Lower the price"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-lg transition hover:border-ink">
        −
      </button>
      <span className="inline-flex items-center font-display text-[26px] font-bold">
        <span aria-hidden>₹</span>
        <input
          value={draft}
          inputMode="numeric"
          aria-label="Price in rupees"
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
          onBlur={() => void commit(Number(draft))}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLElement).blur(); }}
          className="tnum w-[92px] bg-transparent font-display text-[26px] font-bold outline-none"
        />
      </span>
      <button type="button" onClick={() => step(1)} aria-label="Raise the price"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-lg transition hover:border-ink">
        +
      </button>
      <p className="w-full text-[13px] leading-[1.45] text-muted">
        {changed ? (
          <>
            Your price. We suggested {rupees(suggested)}.{' '}
            <button type="button" onClick={() => void commit(suggested)}
              className="underline underline-offset-2 hover:text-ink">
              Reset
            </button>
          </>
        ) : (product.price_reason ?? '')}
      </p>
    </div>
  );
}
