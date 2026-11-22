import { notFound } from 'next/navigation';
import { hashToken } from '@/lib/db';
import { getStoreByToken, getProducts } from '@/lib/store';
import { rupees } from '@/lib/format';
import {
  TopBar, Avatar, coverFor, FORMAT_LABEL,
} from '@/components/storefront';
import Editor from './editor';
import OwnerBar from './owner-bar';

export const dynamic = 'force-dynamic';

export default async function EditPage(
  { params, searchParams }:
  { params: Promise<{ token: string }>; searchParams: Promise<{ preview?: string }> },
) {
  const { token } = await params;
  const { preview } = await searchParams;
  const store = await getStoreByToken(hashToken(token));
  if (!store) notFound();

  const products = await getProducts(store.id);

  // Owner preview: the creator's own page exactly as a buyer sees it,
  // with a bar to get back. Same component tree as /s/[slug] so what
  // they check here is what ships.
  if (preview) {
    return (
      <>
        <TopBar />
        <main className="col pb-28 pt-2">
          <Avatar url={store.avatar_url} name={store.name} />
          <h1 className="mt-[18px] font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.03em]">
            {store.name}
          </h1>
          {store.handle && <p className="mt-1 text-[15px] text-muted">@{store.handle}</p>}
          {store.bio && (
            <p className="mt-[18px] text-[17px] leading-[1.5] text-muted">{store.bio}</p>
          )}

          <section className="mt-8 grid gap-3.5">
            {products.map((p, i) => {
              const [bg, fg] = coverFor(p.position ?? i);
              return (
                <article key={p.id} className="overflow-hidden rounded-card border border-line bg-card">
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
                    {p.promise && <p className="text-[17px]">{p.promise}</p>}
                    {p.description && (
                      <p className="mt-2 text-[15px] leading-[1.6] text-muted">{p.description}</p>
                    )}
                    <div className="mt-5 flex items-center gap-3.5">
                      <span className="tnum font-display text-[28px] font-bold">
                        {rupees(p.price ?? 0)}
                      </span>
                      <span
                        className="flex flex-1 items-center justify-center rounded-full border border-ink text-base font-medium"
                        style={{ minHeight: 52 }}
                      >
                        {p.checkout_link ? 'Get it' : 'Notify me'}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </main>
        <OwnerBar
          token={token}
          slug={store.slug}
          live={store.status === 'published'}
        />
      </>
    );
  }

  return (
    <>
      <TopBar />
      <main className="col pb-[190px] pt-2 lg:max-w-[760px]">
        <Editor token={token} store={store} products={products} />
      </main>
    </>
  );
}
