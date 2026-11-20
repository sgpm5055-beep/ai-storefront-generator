import { notFound } from 'next/navigation';
import { hashToken } from '@/lib/db';
import { getStoreByToken } from '@/lib/store';
import { Shell } from '@/components/ui';
import PublishFlow from './flow';

export const dynamic = 'force-dynamic';

export default async function PublishPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = await getStoreByToken(hashToken(token));
  if (!store) notFound();

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? '';
  return (
    <Shell>
      <PublishFlow
        token={token}
        baseUrl={base}
        needsCode={store.input_type === 'handle' && !store.ownership_confirmed_at}
        handle={store.handle}
        name={store.name ?? 'your storefront'}
        slug={store.slug}
        status={store.status}
      />
    </Shell>
  );
}
