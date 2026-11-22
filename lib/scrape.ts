/**
 * Stage 1 — profile and posts. PRD §FR2.
 *
 * Spike finding that shapes this module: Apify's `details` mode caps
 * latestPosts at 12 and returns NO view counts, while `posts` mode returns
 * 30 with videoPlayCount but takes ~75s. So the two calls are split:
 * `details` (~11s) powers "Found you", `posts` runs behind the progress
 * screen. videoViewCount is always undefined; videoPlayCount is the field.
 */
import type { RawPost } from './select';

import { activeToken, reportExhausted } from './apify-keys';

const ACTOR = 'apify~instagram-scraper';
const BASE = 'https://api.apify.com/v2/acts';

const MAX_KEY_ATTEMPTS = 6;

export type ScrapeFailure =
  | 'not_found' | 'private' | 'no_posts' | 'rate_limited' | 'upstream' | 'config';

export class ScrapeError extends Error {
  constructor(message: string, readonly kind: ScrapeFailure) {
    super(message);
    this.name = 'ScrapeError';
  }
}

/** One line the creator sees. PRD §States: say why, offer a way forward. */
export function scrapeMessage(kind: ScrapeFailure): string {
  switch (kind) {
    case 'not_found':    return "We couldn't find that handle on Instagram. Check the spelling, or describe yourself instead.";
    case 'private':      return 'That account is private, so we cannot read its posts. You can describe yourself instead.';
    case 'no_posts':     return "That account doesn't have enough public posts to work from. You can describe yourself instead.";
    case 'rate_limited': return 'We are reading too many profiles right now. Try again in a few minutes.';
    case 'config':       return 'Profile reading is not configured. You can describe yourself instead.';
    default:             return "We couldn't read that profile just now. Try again, or describe yourself instead.";
  }
}

export interface ScrapedProfile {
  handle: string;
  name: string;
  bio: string;
  followers: number | null;
  postCount: number | null;
  avatarUrl: string | null;
  isPrivate: boolean;
  isVerified: boolean;
}

/**
 * Run the scraper, rotating keys as they run out.
 *
 * Apify's Free plan stops serving at $5/month with a 403. activeToken()
 * retires a key before it gets there; this loop also handles the case
 * where Apify's reported usage lags and a key 403s anyway, by retiring
 * it and retrying on the next one. See lib/apify-keys.ts.
 */
async function runActor(input: unknown, timeoutMs: number): Promise<unknown[]> {
  // Bounded by the key count: each pass either succeeds, fails for a
  // reason unrelated to quota, or retires exactly one key.
  for (let attempt = 0; attempt < MAX_KEY_ATTEMPTS; attempt++) {
    const tok = await activeToken();
    if (!tok) throw new ScrapeError('no Apify key with remaining quota', 'config');

    const url = `${BASE}/${ACTOR}/run-sync-get-dataset-items?token=${tok}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new ScrapeError(`scraper request failed: ${(err as Error).message}`, 'upstream');
    }

    // 403 platform-feature-disabled means this key is spent. Retire it
    // and retry on the next, rather than failing a build the remaining
    // keys could have served.
    if (res.status === 403 || res.status === 402) {
      const another = reportExhausted(tok);
      if (another) continue;
      throw new ScrapeError('all Apify keys exhausted', 'config');
    }

    if (res.status === 429) throw new ScrapeError('scraper rate limited', 'rate_limited');
    if (!res.ok) throw new ScrapeError(`scraper returned ${res.status}`, 'upstream');
    const items = await res.json();
    return Array.isArray(items) ? items : [];
  }
  throw new ScrapeError('all Apify keys exhausted', 'config');
}

/** Normalise a handle from "@name", "name" or a full profile link. PRD §FR1. */
export function normaliseHandle(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  const urlMatch = t.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const raw = urlMatch ? urlMatch[1] : t.replace(/^@/, '');
  const handle = raw.replace(/\/.*$/, '').trim();
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) return null;
  if (/^\.|\.$/.test(handle)) return null;
  return handle.toLowerCase();
}

/**
 * Call 1: the profile on its own, so "Found you" does not wait for posts.
 * PRD §FR2 requires this split; the spike proved it is also the only way
 * to get a fast first response.
 */
/**
 * Is this profile record too empty to build from?
 *
 * Pure and exported so the rule has tests: it has now been wrong twice.
 * The scraper sometimes returns a real-looking but wrong/empty record
 * instead of an error, and the first version of this guard only caught
 * it below 10 followers — @warikoo came back with 27 and @cultfitofficial
 * with 229, so both slipped through and the build blamed the creator for
 * posts it never actually read.
 *
 * postCount === 0 is the reliable signal: the pipeline needs three usable
 * posts, so zero can never succeed regardless of follower count.
 */
export function profileIsUnreadable(postCount: number | null): boolean {
  return (postCount ?? 0) === 0;
}

export async function fetchProfile(handle: string): Promise<ScrapedProfile> {
  const items = await runActor({
    directUrls: [`https://www.instagram.com/${handle}/`],
    resultsType: 'details',
    resultsLimit: 1,
    addParentData: false,
  }, 90_000);

  if (!items.length) throw new ScrapeError('no profile returned', 'not_found');
  const p = items[0] as Record<string, unknown>;

  if (p.error === 'not_found' || (!p.username && !p.fullName)) {
    throw new ScrapeError('handle not found', 'not_found');
  }
  const followers = typeof p.followersCount === 'number' ? p.followersCount : null;
  const postCount = typeof p.postsCount === 'number' ? p.postsCount : null;

  // The spike hit this: a non-existent handle comes back as a real-looking
  // record with 2 followers and 0 posts rather than an error.
  //
  // Testing ten real handles widened it. @warikoo (~1.5M followers) came
  // back as name="", 27 followers, 0 posts; @cultfitofficial as 229
  // followers, 0 posts. Both cleared the `< 10 followers` bar, so the
  // build continued against the wrong account and then told a real
  // creator THEIR posts were too thin — blaming them for our bad read.
  //
  // postCount === 0 is the reliable tell: no account with zero posts can
  // yield the three usable ones the pipeline needs, so there is nothing
  // to gain by continuing, whatever the follower count says.
  if (profileIsUnreadable(postCount)) {
    // 'no_posts', not 'not_found': telling a real creator with 1.5M
    // followers to "check the spelling" is both wrong and insulting.
    throw new ScrapeError('profile returned zero posts', 'no_posts');
  }
  if (p.private === true) throw new ScrapeError('account is private', 'private');

  return {
    handle: String(p.username ?? handle),
    name: String(p.fullName ?? p.username ?? handle),
    bio: String(p.biography ?? ''),
    followers,
    postCount,
    avatarUrl: (p.profilePicUrlHD as string) ?? (p.profilePicUrl as string) ?? null,
    isPrivate: p.private === true,
    isVerified: p.verified === true,
  };
}

/** Call 2: 30 recent posts with play counts. Slow (~75s), runs behind progress. */
export async function fetchPosts(handle: string, limit = 30): Promise<RawPost[]> {
  const items = await runActor({
    directUrls: [`https://www.instagram.com/${handle}/`],
    resultsType: 'posts',
    resultsLimit: limit,
    addParentData: false,
  }, 180_000);

  const posts = items.map(toRawPost).filter((p): p is RawPost => p !== null);
  if (!posts.length) throw new ScrapeError('no posts returned', 'no_posts');
  return posts;
}

function toRawPost(item: unknown): RawPost | null {
  const p = item as Record<string, unknown>;
  const url = typeof p.url === 'string' ? p.url : '';
  if (!url) return null;
  const videoUrl = typeof p.videoUrl === 'string' ? p.videoUrl : null;
  const rawType = String(p.type ?? '');
  const type: RawPost['type'] = videoUrl
    ? 'reel'
    : rawType === 'Sidecar' ? 'carousel' : 'image';

  const images: string[] = [];
  if (Array.isArray(p.images)) images.push(...(p.images as string[]).filter((x) => typeof x === 'string'));
  else if (typeof p.displayUrl === 'string') images.push(p.displayUrl);

  return {
    url,
    type,
    caption: typeof p.caption === 'string' ? p.caption : '',
    videoUrl,
    imageUrls: images,
    // videoViewCount is always undefined in practice; plays is the real field.
    playCount: typeof p.videoPlayCount === 'number' ? p.videoPlayCount
             : typeof p.videoViewCount === 'number' ? p.videoViewCount : null,
    likes: typeof p.likesCount === 'number' ? p.likesCount : null,
    durationSec: typeof p.videoDuration === 'number' ? p.videoDuration : null,
    timestamp: typeof p.timestamp === 'string' ? p.timestamp : null,
  };
}

/** PRD §FR5: re-read the bio to find the ownership code. */
export async function readBio(handle: string): Promise<string> {
  const p = await fetchProfile(handle);
  return p.bio;
}
