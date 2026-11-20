import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStoreBySlug, getProducts } from '@/lib/store';
import { rupees } from '@/lib/format';
import Interest from './interest';

export const dynamic = 'force-dynamic';

const FORMAT_LABEL: Record<string, string> = {
  digital: 'Download', webinar: 'Live workshop',
  session: '1:1 session', course: 'Course',
};

/** Deterministic cover colour from the title: no image generation needed. */
function cover(seed: string) {
  const palette = [
    ['#FFF1E8', '#C2410C'], ['#EEF4FF', '#1D4ED8'], ['#F0FAF2', '#15803D'],
    ['#FBF0FA', '#A21CAF'], ['#FFF8E6', '#A16207'],
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return palette[h % palette.length];
}

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

  return (
    <main className="mx-auto w-full max-w-[560px] px-4 pb-20 pt-10">
      <header className="mb-8 text-center">
        {store.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.avatar_url} alt="" width={72} height={72}
            className="mx-auto mb-3 h-18 w-18 rounded-full object-cover"
            style={{ height: 72, width: 72 }} />
        )}
        <h1 className="text-2xl font-semibold">{store.name}</h1>
        {store.handle && (
          <a href={`https://instagram.com/${store.handle}`}
            target="_blank" rel="noopener noreferrer"
            className="mt-1 inline-block text-sm text-muted underline underline-offset-2">
            @{store.handle}
          </a>
        )}
        {store.bio && (
          <p className="mx-auto mt-3 max-w-[42ch] text-[15px] leading-relaxed text-muted">
            {store.bio}
          </p>
        )}
      </header>

      <section className="grid gap-4">
        {products.map((p) => {
          const [bg, fg] = cover(p.title ?? String(p.position));
          return (
            <article key={p.id} className="card overflow-hidden">
              <div className="flex h-28 items-end p-4" style={{ background: bg }}>
                <h2 className="text-lg font-semibold leading-snug" style={{ color: fg }}>
                  {p.title}
                </h2>
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="chip">{FORMAT_LABEL[p.format] ?? p.format}</span>
                  <span className="text-lg font-semibold">{rupees(p.price ?? 0)}</span>
                </div>
                {p.promise && <p className="text-muted">{p.promise}</p>}
                {p.description && (
                  <p className="mt-2 text-sm leading-relaxed text-muted">{p.description}</p>
                )}
                {p.points && p.points.length > 0 && (
                  <ul className="mt-3 grid gap-1.5 text-sm">
                    {p.points.map((pt, i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden className="text-line">—</span>{pt}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-4">
                  {p.checkout_link ? (
                    <a href={p.checkout_link} target="_blank" rel="noopener noreferrer"
                      className="btn-primary w-full">Get it — {rupees(p.price ?? 0)}</a>
                  ) : (
                    <Interest storeId={store.id} productId={p.id} />
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="mt-10 text-center text-xs text-muted">
        <p>Not selling yet — this page is a preview of what&rsquo;s coming.</p>
        <p className="mt-2">
          <a href="/" className="underline underline-offset-2">Make one like this</a>
        </p>
      </footer>
    </main>
  );
}
