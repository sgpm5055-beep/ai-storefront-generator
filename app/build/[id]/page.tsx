import { notFound } from 'next/navigation';
import BuildProgress from './progress';
import { TopBar, BarLink } from '@/components/storefront';

export const dynamic = 'force-dynamic';

export default async function BuildPage(
  { params, searchParams }:
  { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> },
) {
  const { id } = await params;
  const { t } = await searchParams;

  // A malformed id can never be a build, so that still 404s immediately.
  //
  // A well-formed id does NOT: the row is created and the redirect fires
  // in the same moment, so a server render can lose the race and 404 a
  // build that exists milliseconds later. Worse, Vercel caches that 404 at
  // the edge — `force-dynamic` does not cover the not-found response — so
  // one unlucky request poisoned /build/<id> for everyone, and the
  // creator's own progress screen became a 404.
  //
  // Found by loading the build page straight after starting a build. The
  // client already handles a missing build by polling and then giving up
  // with a real message, so let it: correctness here beats speed.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  return (
    <>
      <TopBar wide right={<BarLink href="/">Start over</BarLink>} />
      <main className="col pb-[190px] pt-2 lg:max-w-[760px]">
        <BuildProgress id={id} token={t ?? ''} />
      </main>
    </>
  );
}
