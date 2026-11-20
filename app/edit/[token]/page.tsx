import { notFound } from 'next/navigation';
import { hashToken } from '@/lib/db';
import { getStoreByToken, getProducts } from '@/lib/store';
import { Shell } from '@/components/ui';
import Editor from './editor';

export const dynamic = 'force-dynamic';

export default async function EditPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = await getStoreByToken(hashToken(token));
  if (!store) notFound();

  const products = await getProducts(store.id);
  return (
    <Shell>
      <Editor token={token} store={store} products={products} />
    </Shell>
  );
}
