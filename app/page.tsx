import StartForm from './start-form';
import { TopBar, BarLink } from '@/components/storefront';
import { listSamples } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function Home(
  { searchParams }: { searchParams: Promise<{ mode?: string }> },
) {
  const { mode } = await searchParams;
  // Samples are a safety net: if every third-party service is down, these
  // still render, because they are plain rows in our own database.
  const samples = await listSamples().catch(() => []);

  return (
    <>
      <TopBar
        wide
        right={samples[0]
          ? <BarLink href={`/s/${samples[0].slug}`}>See a finished one</BarLink>
          : undefined}
      />
      <main className="col pb-[190px] pt-2 lg:max-w-[760px]">
        <StartForm initialMode={mode === 'describe' ? 'describe' : 'handle'} />
      </main>
    </>
  );
}
