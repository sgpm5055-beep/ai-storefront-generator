import { describe, it, expect } from 'vitest';
import {
  rankPosts, buildExtracted, assessSignal, usableCount, hasEnough,
  USABLE_WORD_THRESHOLD, MAX_REEL_SECONDS, type RawPost,
} from './select';

const post = (o: Partial<RawPost> & { url: string }): RawPost => ({
  type: 'reel', caption: '', videoUrl: 'https://v/' + o.url, imageUrls: [],
  playCount: null, likes: null, durationSec: 30, timestamp: '2026-11-01T00:00:00Z',
  ...o,
});

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

describe('rankPosts', () => {
  it('takes the 3 most played reels first', () => {
    const out = rankPosts([
      post({ url: 'a', playCount: 100 }),
      post({ url: 'b', playCount: 900 }),
      post({ url: 'c', playCount: 500 }),
      post({ url: 'd', playCount: 700 }),
    ]);
    expect(out.slice(0, 3).map((p) => p.url)).toEqual(['b', 'd', 'c']);
    expect(out[0].reason).toBe('top_played');
  });

  it('then takes the 2 most recent posts not already chosen', () => {
    const out = rankPosts([
      post({ url: 'r1', playCount: 900, timestamp: '2026-01-01T00:00:00Z' }),
      post({ url: 'r2', playCount: 800, timestamp: '2026-01-02T00:00:00Z' }),
      post({ url: 'r3', playCount: 700, timestamp: '2026-01-03T00:00:00Z' }),
      post({ url: 'new', type: 'image', videoUrl: null, imageUrls: ['i'], timestamp: '2026-11-19T00:00:00Z' }),
    ]);
    const recent = out.filter((p) => p.reason === 'recent');
    expect(recent[0].url).toBe('new');
  });

  it('skips reels longer than the duration cap', () => {
    const out = rankPosts([
      post({ url: 'long', playCount: 9999, durationSec: MAX_REEL_SECONDS + 1 }),
      post({ url: 'ok', playCount: 1, durationSec: 30 }),
    ]);
    expect(out.find((p) => p.url === 'long' && p.reason === 'top_played')).toBeUndefined();
  });

  it('over-fetches beyond the 5 needed, to absorb duds', () => {
    const many = Array.from({ length: 12 }, (_, i) => post({ url: `p${i}`, playCount: 100 - i }));
    expect(rankPosts(many).length).toBeGreaterThan(5);
  });

  it('falls back to most-liked image posts once the recent slots are filled', () => {
    // The two newest posts take the 'recent' slots, so the most-liked rule
    // only fills the spare-candidate tail below them.
    const out = rankPosts([
      post({ url: 'reel', playCount: 10, timestamp: '2026-11-19T00:00:00Z' }),
      post({ url: 'newA', type: 'image', videoUrl: null, imageUrls: ['a'], likes: 1,   timestamp: '2026-11-18T00:00:00Z' }),
      post({ url: 'newB', type: 'image', videoUrl: null, imageUrls: ['b'], likes: 2,   timestamp: '2026-11-17T00:00:00Z' }),
      post({ url: 'oldLow',  type: 'image', videoUrl: null, imageUrls: ['c'], likes: 50,  timestamp: '2026-01-02T00:00:00Z' }),
      post({ url: 'oldHigh', type: 'image', videoUrl: null, imageUrls: ['d'], likes: 900, timestamp: '2026-01-01T00:00:00Z' }),
    ]);
    expect(out.filter((p) => p.reason === 'recent').map((p) => p.url)).toEqual(['newA', 'newB']);
    const liked = out.filter((p) => p.reason === 'most_liked').map((p) => p.url);
    expect(liked[0]).toBe('oldHigh');   // ranked by likes, not recency
  });
});

describe('buildExtracted: the music-only reel case from the spike', () => {
  it('keeps a good transcript', () => {
    const e = buildExtracted(rankPosts([post({ url: 'a' })])[0], words(60), 'transcript');
    expect(e.lowSignal).toBe(false);
    expect(e.source).toBe('transcript');
  });

  it('falls back to the caption when the reel has no speech', () => {
    const p = rankPosts([post({ url: 'a', caption: words(50) })])[0];
    const e = buildExtracted(p, '', 'transcript');   // music-only: zero words
    expect(e.lowSignal).toBe(true);
    expect(e.source).toBe('caption');
    expect(e.text).toContain('w0');
  });

  it('marks it low signal when neither transcript nor caption reaches the threshold', () => {
    const p = rankPosts([post({ url: 'a', caption: 'nice 🔥' })])[0];
    const e = buildExtracted(p, 'la la la', 'transcript');
    expect(e.lowSignal).toBe(true);
  });

  it('treats a short transcript as unusable even when non-empty', () => {
    const p = rankPosts([post({ url: 'a', caption: '' })])[0];
    const e = buildExtracted(p, words(USABLE_WORD_THRESHOLD - 1), 'transcript');
    expect(e.lowSignal).toBe(true);
  });
});

describe('assessSignal', () => {
  const mk = (n: number, good: boolean) =>
    Array.from({ length: n }, (_, i) =>
      buildExtracted(rankPosts([post({ url: 'p' + i })])[0], good ? words(60) : 'x', 'transcript'));

  it('proceeds with 3 or more usable posts', () => {
    const v = assessSignal(mk(3, true));
    expect(v.proceed).toBe(true);
    expect(v.usable).toBe(3);
  });

  it('stops and explains with fewer than 3', () => {
    const v = assessSignal(mk(2, true));
    expect(v.proceed).toBe(false);
    expect(v.reason).toContain('at least 3');
  });

  it('stops when every post is a music-only reel', () => {
    const v = assessSignal(mk(6, false));
    expect(v.proceed).toBe(false);
    expect(v.usable).toBe(0);
  });

  it('hasEnough stops transcription early once 5 clean posts are in', () => {
    expect(hasEnough(mk(5, true))).toBe(true);
    expect(hasEnough(mk(4, true))).toBe(false);
  });
});

describe('against the real spike data', () => {
  it('ranks a genuine scraped profile without crashing', async () => {
    const fs = await import('node:fs');
    if (!fs.existsSync('scratch/posts-mode.json')) return;   // optional fixture
    const raw = JSON.parse(fs.readFileSync('scratch/posts-mode.json', 'utf8'));
    const posts: RawPost[] = raw.map((p: Record<string, unknown>) => ({
      url: String(p.url ?? ''),
      type: p.videoUrl ? 'reel' : 'image',
      caption: String(p.caption ?? ''),
      videoUrl: (p.videoUrl as string) ?? null,
      imageUrls: (p.images as string[]) ?? [],
      playCount: (p.videoPlayCount as number) ?? null,
      likes: (p.likesCount as number) ?? null,
      durationSec: (p.videoDuration as number) ?? null,
      timestamp: (p.timestamp as string) ?? null,
    }));
    const ranked = rankPosts(posts);
    expect(ranked.length).toBeGreaterThanOrEqual(5);
    // The top pick must be the most-played reel inside the duration cap.
    expect(ranked[0].reason).toBe('top_played');
    expect(ranked[0].playCount).toBeGreaterThan(0);
  });
});
