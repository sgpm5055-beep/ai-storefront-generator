import StartForm from './start-form';
import { Shell } from '@/components/ui';
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
    <Shell>
      <header className="mb-8">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
          Storefront draft
        </p>
        <h1 className="text-[28px] font-semibold leading-tight sm:text-[34px]">
          Turn what you already teach into something people can buy.
        </h1>
        <p className="mt-3 text-muted">
          Give us your Instagram handle, or just a line about what you do. You&rsquo;ll
          get a bio, two to four things you could sell, and prices in rupees —
          all editable before anything goes live.
        </p>
      </header>

      <StartForm initialMode={mode === 'describe' ? 'describe' : 'handle'} />

      {samples.length > 0 && (
        <section className="mt-12" aria-labelledby="samples">
          <h2 id="samples" className="mb-3 text-sm font-medium text-muted">
            Or look at one we made earlier
          </h2>
          <ul className="grid gap-2">
            {samples.map((s) => (
              <li key={s.slug}>
                <a href={`/s/${s.slug}`}
                  className="card flex items-center justify-between px-4 py-3 hover:bg-paper">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-sm text-muted">{s.niche.replace(/_/g, ' ')}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-14 text-xs leading-relaxed text-muted">
        We read only public posts. Nothing is published until you say so, and
        you can take it down at any time.
      </footer>
    </Shell>
  );
}
