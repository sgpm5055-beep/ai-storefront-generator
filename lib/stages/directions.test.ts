import { describe, it, expect } from 'vitest';
import { verifyDirections } from './directions';
import type { Direction } from '../schemas';

const SOURCE = [
  'Creator | Actor | New Author',
  'gifting भी ना एक art है, easy नहीं है. लोगों को परखना high effort है and I '
  + 'genuinely believe that what you gift someone says more about you than it '
  + 'does about them.',
  'Catch the entire episode on our youtube, link in bio',
];

const LONG_SEED =
  'I help people pick gifts that actually land, instead of panic buying '
  + 'something generic the night before. I go through how to read what someone '
  + 'actually likes, what to spend, and the difference between a gift that gets '
  + 'used and one that sits in a cupboard. For anyone who finds gifting stressful '
  + 'and wants to get it right.';

const mk = (over: Partial<Direction> = {}): Direction => ({
  topic: 'the art of gifting',
  seed: LONG_SEED,
  because: 'You have strong opinions about what makes a gift land.',
  quote: 'gifting भी ना एक art है, easy नहीं है',
  audience: 'People who find gifting stressful',
  ...over,
});

describe('verifyDirections: a guess must still be anchored', () => {
  it('keeps a direction whose quote is really in the source', () => {
    expect(verifyDirections([mk()], SOURCE)).toHaveLength(1);
  });

  it('drops a fabricated quote, even a plausible one', () => {
    // The model inventing supporting evidence is the failure this whole
    // feature risks, so it is the one case that must never slip through.
    const out = verifyDirections(
      [mk({ quote: 'I have always loved mentoring young creators' })], SOURCE,
    );
    expect(out).toHaveLength(0);
  });

  it('drops a paraphrase of a real quote', () => {
    const out = verifyDirections(
      [mk({ quote: 'gifting is an art and it is not easy at all' })], SOURCE,
    );
    expect(out).toHaveLength(0);
  });

  it('ignores punctuation and spacing differences in a real quote', () => {
    const out = verifyDirections(
      [mk({ quote: 'Creator  |  Actor  |  New   Author!' })], SOURCE,
    );
    expect(out).toHaveLength(1);
  });

  it('drops a quote too short to prove anything', () => {
    expect(verifyDirections([mk({ quote: 'art' })], SOURCE)).toHaveLength(0);
  });

  it('drops a direction that claims a credential', () => {
    const out = verifyDirections(
      [mk({ topic: 'gifting masterclass from a proven expert' })], SOURCE,
    );
    expect(out).toHaveLength(0);
  });

  it('drops a credential hidden in the seed rather than the topic', () => {
    const out = verifyDirections(
      [mk({ seed: `${LONG_SEED} I have 10 years of experience doing this.` })],
      SOURCE,
    );
    expect(out).toHaveLength(0);
  });

  it('drops a seed too thin to build a store from', () => {
    expect(verifyDirections([mk({ seed: 'Gifting tips.' })], SOURCE)).toHaveLength(0);
  });

  it('drops a repeat of the same topic', () => {
    const out = verifyDirections([mk(), mk()], SOURCE);
    expect(out).toHaveLength(1);
  });

  it('caps at three', () => {
    const many = ['one', 'two', 'three', 'four'].map((t) => mk({ topic: `gifting ${t}` }));
    expect(verifyDirections(many, SOURCE)).toHaveLength(3);
  });

  it('returns nothing when the model returned nothing', () => {
    expect(verifyDirections([], SOURCE)).toEqual([]);
  });

  it('returns nothing when there is no source text to anchor against', () => {
    // The thin case: no quotable material means no directions, whatever
    // the model produced.
    expect(verifyDirections([mk()], [])).toEqual([]);
  });
});
