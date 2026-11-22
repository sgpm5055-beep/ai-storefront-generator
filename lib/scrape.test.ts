import { describe, it, expect } from 'vitest';
import { normaliseHandle, profileIsUnreadable, scrapeMessage } from './scrape';

describe('profileIsUnreadable: did we actually read this account?', () => {
  // Real records from testing ten handles against production.
  it('rejects a record the scraper returned empty', () => {
    // @warikoo: ~1.5M real followers, came back as 27 / 0 posts.
    expect(profileIsUnreadable(0)).toBe(true);
    // @cultfitofficial: came back as 229 followers / 0 posts.
    expect(profileIsUnreadable(0)).toBe(true);
  });

  it('rejects a missing post count', () => {
    expect(profileIsUnreadable(null)).toBe(true);
  });

  it('accepts a genuinely small but real account', () => {
    // A new creator with few posts is exactly who this product is for.
    expect(profileIsUnreadable(1)).toBe(false);
    expect(profileIsUnreadable(4)).toBe(false);
  });

  it('accepts a large account', () => {
    expect(profileIsUnreadable(4826)).toBe(false);
  });
});

describe('scrapeMessage: a failed read must not blame the creator', () => {
  it('does not tell a real creator to check their spelling', () => {
    // The empty-record case maps to no_posts, not not_found.
    expect(scrapeMessage('no_posts')).not.toMatch(/spelling/i);
    expect(scrapeMessage('no_posts')).toMatch(/describe yourself/i);
  });

  it('always offers a next step', () => {
    for (const k of ['not_found', 'private', 'no_posts', 'rate_limited', 'config'] as const) {
      expect(scrapeMessage(k).length).toBeGreaterThan(20);
    }
  });
});

describe('normaliseHandle', () => {
  it('accepts the forms a creator actually types', () => {
    expect(normaliseHandle('@shivesh17')).toBe('shivesh17');
    expect(normaliseHandle('shivesh17')).toBe('shivesh17');
    expect(normaliseHandle('https://www.instagram.com/shivesh17/')).toBe('shivesh17');
  });

  it('rejects gibberish', () => {
    expect(normaliseHandle('@@@###')).toBeNull();
  });
});
