import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStoreBySlug, getProducts } from '@/lib/store';
import { rupees } from '@/lib/format';
import {
  TopBar, BarLink, Avatar, coverFor, FORMAT_LABEL,
} from '@/components/storefront';
import Interest from './interest';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  if (!store || store.status !== 'published') return { title: 'Not found' };
  return {
    title: `${store.name} — storefront`,
    description: store.bio ?? undefined,
    openGraph: {
      title: `${store.name}`,
      description: store.bio ?? undefined,
      type: 'profile',
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);
  // An unpublished store is a 404 to the public, not a "taken down" page:
  // the creator's draft content should not be inferable from the URL.
  if (!store || store.status !== 'published') notFound();

  const products = await getProducts(store.id);
  const anyCheckout = products.some((p) => p.checkout_link);

  return (
    <>
      <TopBar right={<BarLink href="/">Make your own</BarLink>} />

      <main className="col pb-24 pt-2">
        <header>
          <Avatar url={store.avatar_url} name={store.name} />

          <h1 className="mt-[18px] font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.03em]">
            {store.name}
          </h1>

          {store.handle && (
            <a
              href={`https://instagram.com/${store.handle}`}
              target="_blank" rel="noopener noreferrer"
              className="mt-1 inline-block text-[15px] text-muted underline underline-offset-[3px]"
            >
              @{store.handle}
            </a>
          )}

          {store.bio && (
            <p className="mt-[18px] text-[17px] leading-[1.5] text-muted">{store.bio}</p>
          )}
        </header>

        <section className="mt-8 grid gap-3.5">
          {products.map((p, i) => {
            const [bg, fg] = coverFor(p.position ?? i);
            return (
              <article
                key={p.id}
                className="overflow-hidden rounded-card border border-line bg-card"
              >
                <div className="grid gap-[22px] p-[18px]" style={{ background: bg }}>
                  <span className="label-caps" style={{ color: fg }}>
                    {FORMAT_LABEL[p.format] ?? p.format}
                  </span>
                  <h2
                    className="font-display text-[26px] font-semibold leading-[1.1] tracking-[-0.025em]"
                    style={{ color: fg, textWrap: 'balance' }}
                  >
                    {p.title}
                  </h2>
                </div>

                <div className="p-[18px] pt-4">
                  {p.promise && <p className="text-[17px] text-ink">{p.promise}</p>}
                  {p.description && (
                    <p className="mt-2 text-[15px] leading-[1.6] text-muted">{p.description}</p>
                  )}

                  {p.points && p.points.length > 0 && (
                    <ul className="mt-3 grid gap-1.5 text-[15px]">
                      {p.points.map((pt, j) => (
                        <li key={j} className="flex gap-2">
                          <span aria-hidden className="text-ghost-line">—</span>{pt}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-5 flex items-center gap-3.5">
                    <span className="tnum font-display text-[28px] font-bold">
                      {rupees(p.price ?? 0)}
                    </span>
                    {p.checkout_link ? (
                      <a
                        href={p.checkout_link} target="_blank" rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center rounded-full bg-ink text-base font-medium text-white transition hover:bg-black active:scale-[.99]"
                        style={{ minHeight: 52 }}
                      >
                        Get it
                      </a>
                    ) : (
                      <Interest storeId={store.id} productId={p.id} />
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {/* Only when nothing is actually buyable: this used to render even
            beside a working "Get it" button, contradicting it. */}
        {!anyCheckout && (
          <p className="mt-10 text-center text-[13px] text-muted">
            Opening soon. Tap “Notify me” and you’ll hear first.
          </p>
        )}
      </main>
    </>
  );
}
