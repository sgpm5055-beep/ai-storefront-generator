import { ImageResponse } from 'next/og';
import { getStoreBySlug, getProducts } from '@/lib/store';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Storefront preview';

/**
 * Typographic preview. No image generation: the creator's own words are
 * the strongest thing we have, and this renders in milliseconds.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug).catch(() => null);
  const products = store ? await getProducts(store.id).catch(() => []) : [];

  const name = store?.name ?? 'Storefront';
  // Cut on a word boundary: a hard slice leaves "kada" where the bio said
  // "kadai", which is the first thing anyone sees of this creator.
  const raw = store?.bio ?? '';
  const bio = raw.length <= 120
    ? raw
    : raw.slice(0, 120).replace(/\s+\S*$/, '') + '…';
  const from = products.length
    ? Math.min(...products.map((p) => p.price ?? 0).filter((n) => n > 0))
    : 0;

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', background: '#FBF9F5', color: '#15130F',
        padding: 72, fontFamily: 'sans-serif',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 26, color: '#6B6358', letterSpacing: 1 }}>
            {store?.handle ? `@${store.handle}` : 'STOREFRONT'}
          </div>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>{name}</div>
          {bio && <div style={{ fontSize: 32, color: '#6B6358', lineHeight: 1.35 }}>{bio}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 28 }}>
          <div style={{
            display: 'flex', background: '#15130F', color: '#fff',
            padding: '12px 24px', borderRadius: 999,
          }}>
            {products.length} {products.length === 1 ? 'thing' : 'things'} to buy
          </div>
          {from > 0 && (
            // "Rs." not "₹": next/og's default font has no rupee glyph and
            // silently drops it, which would blank the price in every
            // WhatsApp and Instagram link preview.
            <div style={{ display: 'flex', color: '#6B6358' }}>from Rs. {from.toLocaleString('en-IN')}</div>
          )}
        </div>
      </div>
    ),
    size,
  );
}
