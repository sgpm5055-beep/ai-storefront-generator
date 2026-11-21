import { describe, it, expect } from 'vitest';
import { GATE, judgePasses, attemptScore, judgeFeedback } from './check';
import type { Judge } from '../schemas';

const good = (over: Partial<Judge> = {}): Judge => ({
  faithful: true,
  unfaithful_claims: [],
  policy_ok: true,
  policy_problems: [],
  specificity: 4,
  makeability: 4,
  voice_match: 4,
  ...over,
});

describe('judgePasses: what reaches the creator', () => {
  it('passes a clean judgement', () => {
    expect(judgePasses(good())).toBe(true);
  });

  it('passes exactly at every threshold', () => {
    expect(judgePasses(good({
      specificity: GATE.specificity,
      makeability: GATE.makeability,
      voice_match: GATE.voice_match,
    }))).toBe(true);
  });

  // The two hard gates. A fabricated claim on a real person's public page
  // is the worst output in the system, whatever else scored well.
  it('fails an unfaithful store even with perfect scores', () => {
    expect(judgePasses(good({
      faithful: false, specificity: 5, makeability: 5, voice_match: 5,
    }))).toBe(false);
  });

  it('fails a policy problem even with perfect scores', () => {
    expect(judgePasses(good({
      policy_ok: false, specificity: 5, makeability: 5, voice_match: 5,
    }))).toBe(false);
  });

  it.each([
    ['specificity', { specificity: GATE.specificity - 1 }],
    ['makeability', { makeability: GATE.makeability - 1 }],
    ['voice_match', { voice_match: GATE.voice_match - 1 }],
  ])('fails one point below the %s threshold', (_label, over) => {
    expect(judgePasses(good(over))).toBe(false);
  });

  // A mean-based gate would pass this: (1+5+5)/3 = 3.67. The swap test
  // exists precisely to catch a store that could belong to anyone.
  it('fails specificity 1 that a composite average would hide', () => {
    expect(judgePasses(good({ specificity: 1, makeability: 5, voice_match: 5 })))
      .toBe(false);
  });
});

describe('attemptScore: which attempt ships', () => {
  it('ranks a faithful store above an unfaithful one with better scores', () => {
    const faithfulButPlain = good({ specificity: 3, makeability: 3, voice_match: 3 });
    const unfaithfulButPolished = good({
      faithful: false, specificity: 5, makeability: 5, voice_match: 5,
    });
    expect(attemptScore(faithfulButPlain))
      .toBeGreaterThan(attemptScore(unfaithfulButPolished));
  });

  it('prefers higher specificity when both attempts are clean', () => {
    expect(attemptScore(good({ specificity: 5 })))
      .toBeGreaterThan(attemptScore(good({ specificity: 3 })));
  });

  it('weights specificity above voice', () => {
    // One point of specificity must outweigh one point of voice, or the
    // ranking would trade the product's core claim for polish.
    const spec = good({ specificity: 5, voice_match: 3 });
    const voice = good({ specificity: 4, voice_match: 5 });
    expect(attemptScore(spec)).toBeGreaterThan(attemptScore(voice));
  });
});

describe('judgeFeedback: what the rewrite is told', () => {
  it('quotes the offending claims rather than describing them', () => {
    const fb = judgeFeedback(good({
      faithful: false,
      unfaithful_claims: ['"15 tested recipes" — the source names no count'],
    }));
    expect(fb).toContain('15 tested recipes');
    expect(fb).toContain('NOT supported');
  });

  it('quotes policy problems', () => {
    const fb = judgeFeedback(good({
      policy_ok: false,
      policy_problems: ['"bake your first cake today" promises an outcome'],
    }));
    expect(fb).toContain('bake your first cake today');
  });

  it('points a generic store back at the style reference', () => {
    const fb = judgeFeedback(good({ specificity: 1 }));
    expect(fb).toContain('style reference');
    expect(fb).toContain('only belong to THIS creator');
  });

  it('says nothing when there is nothing to fix', () => {
    expect(judgeFeedback(good())).toBe('');
  });

  it('reports every failing dimension at once', () => {
    const fb = judgeFeedback(good({
      faithful: false,
      unfaithful_claims: ['invented a number'],
      specificity: 1,
      makeability: 1,
    }));
    expect(fb).toContain('invented a number');
    expect(fb).toContain('Specificity scored 1');
    expect(fb).toContain('Makeability scored 1');
  });
});
