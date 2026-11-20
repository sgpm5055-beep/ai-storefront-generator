/**
 * The 12 worked examples from PRD §India pricing logic, verbatim.
 * These are the acceptance tests for the pricing hard gate.
 */
import { describe, it, expect } from 'vitest';
import {
  basePrice, snap, priceLadder, audienceMultiplier, nicheMultiplier,
  type Format, type Scope,
} from './pricing';

describe('snap', () => {
  it('snaps to the nearest price point', () => {
    expect(snap(209.3)).toBe(199);
    expect(snap(388.7)).toBe(399);
    expect(snap(2598.7)).toBe(2499);
  });
  it('snaps down on a tie', () => {
    // 224 is equidistant from 199 and 249
    expect(snap(224)).toBe(199);
  });
  it('returns an exact point unchanged', () => {
    expect(snap(299)).toBe(299);
  });
});

describe('multipliers', () => {
  it('bands audience by follower count', () => {
    expect(audienceMultiplier(8_000)).toBe(0.9);
    expect(audienceMultiplier(24_000)).toBe(1.0);
    expect(audienceMultiplier(120_000)).toBe(1.15);
    expect(audienceMultiplier(null)).toBe(1.0);   // unknown
  });
  it('bands niche into the three tiers', () => {
    expect(nicheMultiplier('exam_prep')).toBe(0.8);
    expect(nicheMultiplier('fitness')).toBe(1.0);
    expect(nicheMultiplier('careers')).toBe(1.3);
  });
});

/** The PRD table, one row per case, before ladder adjustment. */
const WORKED_EXAMPLES: Array<{
  name: string; format: Format; niche: string; followers: number; scope: Scope; expected: number;
}> = [
  { name: 'Fitness 24K, digital small',    format: 'digital', niche: 'fitness',  followers: 24_000,  scope: 'small',    expected: 199 },
  { name: 'Fitness 24K, webinar standard', format: 'webinar', niche: 'fitness',  followers: 24_000,  scope: 'standard', expected: 299 },
  { name: 'Fitness 24K, 1:1 standard',     format: 'session', niche: 'fitness',  followers: 24_000,  scope: 'standard', expected: 799 },
  { name: 'Careers 60K, digital standard', format: 'digital', niche: 'careers',  followers: 60_000,  scope: 'standard', expected: 399 },
  { name: 'Careers 60K, 1:1 standard',     format: 'session', niche: 'careers',  followers: 60_000,  scope: 'standard', expected: 999 },
  { name: 'Careers 60K, course standard',  format: 'course',  niche: 'careers',  followers: 60_000,  scope: 'standard', expected: 2499 },
  { name: 'Exam prep 8K, digital small',   format: 'digital', niche: 'exam_prep', followers: 8_000,  scope: 'small',    expected: 149 },
  { name: 'Exam prep 8K, 1:1 standard',    format: 'session', niche: 'exam_prep', followers: 8_000,  scope: 'standard', expected: 599 },
  { name: 'Fitness 120K, digital large',   format: 'digital', niche: 'fitness',  followers: 120_000, scope: 'large',    expected: 499 },
];

describe('basePrice: PRD worked examples', () => {
  for (const c of WORKED_EXAMPLES) {
    it(`${c.name} -> ₹${c.expected}`, () => {
      expect(basePrice({ format: c.format, niche: c.niche, followers: c.followers, scope: c.scope }).price)
        .toBe(c.expected);
    });
  }

  // These three snap to a value the ladder rule then corrects. Base shown here.
  it('Exam prep 8K, webinar standard -> ₹199 before the ladder rule', () => {
    expect(basePrice({ format: 'webinar', niche: 'exam_prep', followers: 8_000, scope: 'standard' }).price).toBe(199);
  });
  it('Fitness 120K, webinar standard -> ₹299 before the ladder rule', () => {
    expect(basePrice({ format: 'webinar', niche: 'fitness', followers: 120_000, scope: 'standard' }).price).toBe(299);
  });
  it('Fitness 120K, 1:1 standard -> ₹999 before the ladder rule', () => {
    expect(basePrice({ format: 'session', niche: 'fitness', followers: 120_000, scope: 'standard' }).price).toBe(999);
  });
});

describe('priceLadder: the three PRD ladders that need rule 3', () => {
  it('Exam prep 8K: webinar rises 199 -> 249', () => {
    const out = priceLadder([
      { format: 'digital', niche: 'exam_prep', followers: 8_000, scope: 'small',    role: 'entry' },
      { format: 'webinar', niche: 'exam_prep', followers: 8_000, scope: 'standard', role: 'core' },
      { format: 'session', niche: 'exam_prep', followers: 8_000, scope: 'standard', role: 'premium' },
    ]);
    expect(out.map((p) => p.price)).toEqual([149, 249, 599]);
  });

  it('Fitness 120K: webinar 299 -> 799 and 1:1 999 -> 1299', () => {
    const out = priceLadder([
      { format: 'digital', niche: 'fitness', followers: 120_000, scope: 'large',    role: 'entry' },
      { format: 'webinar', niche: 'fitness', followers: 120_000, scope: 'standard', role: 'core' },
      { format: 'session', niche: 'fitness', followers: 120_000, scope: 'standard', role: 'premium' },
    ]);
    expect(out.map((p) => p.price)).toEqual([499, 799, 1299]);
  });

  it('Careers 60K: already satisfies rule 3, nothing moves', () => {
    const out = priceLadder([
      { format: 'digital', niche: 'careers', followers: 60_000, scope: 'standard', role: 'entry' },
      { format: 'session', niche: 'careers', followers: 60_000, scope: 'standard', role: 'core' },
      { format: 'course',  niche: 'careers', followers: 60_000, scope: 'standard', role: 'premium' },
    ]);
    expect(out.map((p) => p.price)).toEqual([399, 999, 2499]);
  });

  it('Fitness 24K: already satisfies rule 3, nothing moves', () => {
    const out = priceLadder([
      { format: 'digital', niche: 'fitness', followers: 24_000, scope: 'small',    role: 'entry' },
      { format: 'webinar', niche: 'fitness', followers: 24_000, scope: 'standard', role: 'core' },
      { format: 'session', niche: 'fitness', followers: 24_000, scope: 'standard', role: 'premium' },
    ]);
    expect(out.map((p) => p.price)).toEqual([199, 299, 799]);
  });
});

describe('ladder invariants hold for every generated store', () => {
  it('rule 2: the cheapest product is never above ₹499', () => {
    const out = priceLadder([
      { format: 'digital', niche: 'careers', followers: 200_000, scope: 'large',    role: 'entry' },
      { format: 'session', niche: 'careers', followers: 200_000, scope: 'standard', role: 'core' },
      { format: 'course',  niche: 'careers', followers: 200_000, scope: 'large',    role: 'premium' },
    ]);
    expect(Math.min(...out.map((p) => p.price))).toBeLessThanOrEqual(499);
  });

  it('rule 3: each product is at least 1.5x the one below it', () => {
    const out = priceLadder([
      { format: 'digital', niche: 'astrology', followers: 50_000, scope: 'standard', role: 'entry' },
      { format: 'webinar', niche: 'astrology', followers: 50_000, scope: 'standard', role: 'core' },
      { format: 'session', niche: 'astrology', followers: 50_000, scope: 'standard', role: 'premium' },
    ]);
    const prices = out.map((p) => p.price);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1] * 1.5);
    }
  });

  it('rule 4: nothing exceeds ₹4,999', () => {
    const out = priceLadder([
      { format: 'digital', niche: 'business', followers: 500_000, scope: 'large', role: 'entry' },
      { format: 'session', niche: 'business', followers: 500_000, scope: 'large', role: 'core' },
      { format: 'course',  niche: 'business', followers: 500_000, scope: 'large', role: 'premium' },
    ]);
    expect(Math.max(...out.map((p) => p.price))).toBeLessThanOrEqual(4999);
  });

  it('records the pre-ladder price for calibration', () => {
    const out = priceLadder([
      { format: 'digital', niche: 'fitness', followers: 120_000, scope: 'large',    role: 'entry' },
      { format: 'webinar', niche: 'fitness', followers: 120_000, scope: 'standard', role: 'core' },
      { format: 'session', niche: 'fitness', followers: 120_000, scope: 'standard', role: 'premium' },
    ]);
    expect(out[1].suggestedPrice).toBe(299);  // what the formula said
    expect(out[1].price).toBe(799);           // what the ladder rule enforced
  });

  it('prices a two-product store', () => {
    const out = priceLadder([
      { format: 'digital', niche: 'food', followers: 15_000, scope: 'standard', role: 'entry' },
      { format: 'session', niche: 'food', followers: 15_000, scope: 'standard', role: 'premium' },
    ]);
    expect(out[1].price).toBeGreaterThanOrEqual(out[0].price * 1.5);
    expect(out[0].price).toBeLessThanOrEqual(499);
  });
});

describe('price reason', () => {
  it('gives one plain line naming the audience', () => {
    const out = priceLadder([
      { format: 'digital', niche: 'fitness', followers: 24_000, scope: 'small', role: 'entry' },
    ]);
    expect(out[0].reason).toContain('₹199');
    expect(out[0].reason).toContain('easy first purchase');
    expect(out[0].reason).toContain('24K');
  });
});

describe('unsatisfiable ladders: the ceiling always wins', () => {
  it('two courses cannot sit 1.5x apart under ₹4,999, so the lower one drops', () => {
    // Found by exhaustive sweep, not present in the PRD's 12 examples.
    // 3999 -> 4999 is only 1.25x and rule 4 blocks going higher,
    // so rule 3 is satisfied by moving the core product down instead.
    const out = priceLadder([
      { format: 'digital', niche: 'careers', followers: 1_000, scope: 'small',  role: 'entry' },
      { format: 'course',  niche: 'careers', followers: 1_000, scope: 'large',  role: 'core' },
      { format: 'course',  niche: 'careers', followers: 1_000, scope: 'small',  role: 'premium' },
    ]);
    const prices = out.map((p) => p.price);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1] * 1.5);
    }
    expect(Math.max(...prices)).toBeLessThanOrEqual(4999);
  });

  it('holds across every format, niche, scope and follower combination', () => {
    const formats: Format[] = ['digital', 'webinar', 'session', 'course'];
    const scopes: Scope[] = ['small', 'standard', 'large'];
    const niches = ['exam_prep', 'fitness', 'careers'];
    const followerSet = [1_000, 24_000, 120_000, 2_000_000];
    const entryFormats: Format[] = ['digital', 'webinar'];
    const premiumFormats: Format[] = ['session', 'course'];

    for (const niche of niches)
      for (const followers of followerSet)
        for (const ef of entryFormats)
          for (const es of scopes)
            for (const cf of formats)
              for (const cs of scopes)
                for (const pf of premiumFormats)
                  for (const ps of scopes) {
                    const prices = priceLadder([
                      { format: ef, niche, followers, scope: es, role: 'entry' },
                      { format: cf, niche, followers, scope: cs, role: 'core' },
                      { format: pf, niche, followers, scope: ps, role: 'premium' },
                    ]).map((p) => p.price);

                    expect(Math.min(...prices)).toBeLessThanOrEqual(499);
                    expect(Math.max(...prices)).toBeLessThanOrEqual(4999);
                    for (let i = 1; i < prices.length; i++) {
                      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1] * 1.5);
                    }
                  }
  });
});
