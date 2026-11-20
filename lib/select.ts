/**
 * Stage 2 — pick the posts to transcribe. PRD §FR2.
 *
 * The spike changed this design. Play count does not predict transcript
 * quality: of the three most-played reels on a real account, one returned
 * zero words (music only) and one returned song lyrics. So we over-fetch
 * candidates, transcribe in priority order, and stop once enough posts
 * clear the usability threshold.
 */
import { wordCount } from './schemas';

/** Shape we need from the scraper, normalised. */
export interface RawPost {
  url: string;
  type: 'reel' | 'video' | 'image' | 'carousel';
  caption: string;
  videoUrl: string | null;
  imageUrls: string[];
  playCount: number | null;
  likes: number | null;
  durationSec: number | null;
  timestamp: string | null;
}

export interface SelectedPost extends RawPost {
  /** Why it was picked, for the progress screen and for debugging. */
  reason: 'top_played' | 'recent' | 'most_liked';
}

/** PRD: a post is usable when its text gives at least 40 words. */
export const USABLE_WORD_THRESHOLD = 40;
/** PRD: fewer than 3 usable posts means stop and offer the description path. */
export const MIN_USABLE_POSTS = 3;
/** PRD: 5 posts feed the pipeline. */
export const TARGET_POSTS = 5;
/**
 * Transcribing is the slow step (~10s per reel), so cap how many we try.
 * Over-fetching beyond the target is what absorbs music-only reels.
 */
export const MAX_TRANSCRIBE_ATTEMPTS = 8;

/**
 * How many posts are downloaded and transcribed at once.
 *
 * Sized against the measured cost: one post is ~20-25s (download +
 * Deepgram), and Vercel Hobby caps a function at 300s. Five in sequence
 * took a real build to 250s. Four at a time keeps the common case near
 * one batch while leaving the early stop useful.
 */
export const TRANSCRIBE_BATCH = 4;
/** Long reels cost download time and add little. Skip them. */
export const MAX_REEL_SECONDS = 120;

function isVideo(p: RawPost): boolean {
  return Boolean(p.videoUrl) && (p.type === 'reel' || p.type === 'video');
}

/**
 * Order posts by how likely they are to carry the creator's expertise.
 *
 * PRD: the 3 most viewed reels, then the 2 most recent posts not already
 * chosen, with the most-liked image posts filling any gap. We return a
 * longer ranked list than we need so the caller can skip duds.
 */
export function rankPosts(posts: RawPost[]): SelectedPost[] {
  const videos = posts.filter(isVideo)
    .filter((p) => !p.durationSec || p.durationSec <= MAX_REEL_SECONDS);

  const topPlayed = [...videos]
    .sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0))
    .map((p): SelectedPost => ({ ...p, reason: 'top_played' }));

  const chosen = new Set<string>();
  const out: SelectedPost[] = [];

  // 3 most played reels.
  for (const p of topPlayed.slice(0, 3)) {
    out.push(p);
    chosen.add(p.url);
  }

  // 2 most recent posts not already chosen.
  const recent = [...posts]
    .filter((p) => !chosen.has(p.url))
    .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
  for (const p of recent.slice(0, 2)) {
    out.push({ ...p, reason: 'recent' });
    chosen.add(p.url);
  }

  // Spare candidates, best first, to absorb posts that yield no text:
  // remaining reels by plays, then image posts by likes.
  for (const p of topPlayed) {
    if (!chosen.has(p.url)) { out.push(p); chosen.add(p.url); }
  }
  const byLikes = [...posts]
    .filter((p) => !chosen.has(p.url))
    .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
  for (const p of byLikes) {
    out.push({ ...p, reason: 'most_liked' });
    chosen.add(p.url);
  }

  return out.slice(0, MAX_TRANSCRIBE_ATTEMPTS);
}

export interface ExtractedPost {
  post: SelectedPost;
  text: string;
  source: 'transcript' | 'image_text' | 'caption';
  lowSignal: boolean;
}

/**
 * PRD: a video with no speech falls back to its caption and is marked low
 * signal. A post counts as usable when its text reaches 40 words.
 */
export function buildExtracted(
  post: SelectedPost,
  extracted: string | null,
  source: 'transcript' | 'image_text',
): ExtractedPost {
  const text = (extracted ?? '').trim();
  if (wordCount(text) >= USABLE_WORD_THRESHOLD) {
    return { post, text, source, lowSignal: false };
  }
  // Not enough from the media: fall back to the caption, flagged low signal.
  const caption = (post.caption ?? '').trim();
  const best = wordCount(caption) > wordCount(text) ? caption : text;
  return { post, text: best, source: best === caption ? 'caption' : source, lowSignal: true };
}

export function usableCount(posts: ExtractedPost[]): number {
  return posts.filter((p) => wordCount(p.text) >= USABLE_WORD_THRESHOLD).length;
}

/** Have we got enough to stop transcribing? */
export function hasEnough(posts: ExtractedPost[]): boolean {
  return posts.filter((p) => !p.lowSignal).length >= TARGET_POSTS
    || usableCount(posts) >= TARGET_POSTS;
}

export interface SignalVerdict {
  proceed: boolean;
  reason: string | null;
  usable: number;
}

/**
 * The stop decision. PRD: fewer than 3 usable posts, or no teachable
 * signal, means say so and offer the description path rather than
 * inventing expertise.
 */
export function assessSignal(posts: ExtractedPost[]): SignalVerdict {
  const usable = usableCount(posts);
  if (usable < MIN_USABLE_POSTS) {
    return {
      proceed: false,
      usable,
      reason: `Only ${usable} of your recent posts had enough spoken or written content to work from. We need at least ${MIN_USABLE_POSTS}.`,
    };
  }
  return { proceed: true, reason: null, usable };
}
