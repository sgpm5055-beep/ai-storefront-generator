/**
 * Shared chrome for the redesigned flow.
 *
 * The design handoff's central idea: the storefront page IS the
 * interface. The creator lands on their own empty store, watches it fill
 * in, edits it in place and publishes it — so `/`, `/build/[id]`,
 * `/edit/[token]` and `/s/[slug]` all render the same skeleton with the
 * header, avatar and product slots in identical positions. Moving
 * between routes should feel like no navigation happened.
 *
 * These are the pieces every mode shares. Mode-specific behaviour lives
 * with its route.
 */
import Link from 'next/link';

/**
 * Cover colours by POSITION, not by hashing the title.
 *
 * The old page hashed the title, so a creator editing their product name
 * saw the card change colour under them. Position keeps it stable.
 */
export const COVERS: ReadonlyArray<readonly [string, string]> = [
  ['#FFF1E8', '#C2410C'],
  ['#EEF4FF', '#1D4ED8'],
  ['#F0FAF2', '#15803D'],
  ['#FBF0FA', '#A21CAF'],
] as const;

export const coverFor = (position: number) => COVERS[position % COVERS.length];

export const FORMAT_LABEL: Record<string, string> = {
  digital: 'Download',
  webinar: 'Live workshop',
  session: '1:1 session',
  course: 'Course',
};

/** The three ghost slots before anything is generated. */
export const GHOST_FORMATS = ['Download', 'Live workshop', '1:1 session'];

export const GHOST_NOTES = [
  'Something small that people can buy without thinking twice.',
  'A live session, priced a step above the first.',
  'Your own time, priced highest.',
];

export const DESCRIBE_EXAMPLE =
  'I teach eggless baking to home cooks. Most of them have no oven, so '
  + 'everything I make works in a cooker or a kadai. I answer a lot of '
  + 'questions about why cakes sink, and I share weekend recipes that use '
  + 'ingredients people already have at home.';

/** Wordmark: a 10px accent dot and the name. */
export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Storefront home">
      <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
      <span className="font-display text-[17px] font-bold tracking-[-0.02em] text-ink">
        Storefront
      </span>
    </Link>
  );
}

/** 60px top bar. Left: wordmark. Right: whatever the mode needs. */
export function TopBar(
  { right, wide }: { right?: React.ReactNode; wide?: boolean },
) {
  return (
    <header className={`${wide ? 'col-wide' : 'col'} flex h-[60px] items-center justify-between`}>
      <Wordmark />
      {right ? <div className="flex items-center gap-3">{right}</div> : null}
    </header>
  );
}

/** A quiet underlined link, used throughout the top bar. */
export function BarLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-muted underline underline-offset-[3px] transition hover:text-ink"
    >
      {children}
    </Link>
  );
}

/**
 * 72px avatar. Three states: a dashed ghost before we know who they are,
 * the real picture, or their initial on accent-soft.
 */
export function Avatar(
  { url, name, ghost }: { url?: string | null; name?: string | null; ghost?: boolean },
) {
  if (ghost) {
    return (
      <div
        aria-hidden
        className="h-[72px] w-[72px] rounded-full border-[1.5px] border-dashed border-ghost-line"
      />
    );
  }
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url} alt="" width={72} height={72}
        className="h-[72px] w-[72px] animate-pop rounded-full object-cover"
      />
    );
  }
  const initial = (name ?? '').trim().charAt(0).toUpperCase() || '·';
  return (
    <div
      aria-hidden
      className="flex h-[72px] w-[72px] animate-pop items-center justify-center rounded-full bg-accent-soft font-display text-[30px] font-bold text-accent"
    >
      {initial}
    </div>
  );
}

/**
 * The margin note beside the header on desktop.
 *
 * Hidden below 840px: on a phone it would be noise between the header
 * and the thing it describes.
 */
export function MarginNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <aside className="mt-[26px] hidden border-t border-ink pt-2.5 text-[13px] leading-[1.5] text-muted lg:block">
      {children}
    </aside>
  );
}

/** A ghost bar standing in for text that has not arrived yet. */
export function GhostBar(
  { w, h = 12, pulse }: { w: string; h?: number; pulse?: boolean },
) {
  return (
    <div
      aria-hidden
      className={`ghost-bar ${pulse ? 'animate-ghost-pulse' : ''}`}
      style={{ width: w, height: h }}
    />
  );
}

export function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${
        light ? 'border-white/30 border-t-white' : 'border-ink/20 border-t-ink'
      }`}
      style={{ animationDuration: '.7s' }}
    />
  );
}
