import { describe, it, expect } from 'vitest';
import { clampCopy, wordCount, type Copy } from './schemas';

const mk = (over: Partial<Copy['products'][0]>): Copy => ({
  bio: 'Home baker in Pune.',
  products: [{
    title: 'T', promise: 'P', description: 'D', points: ['a', 'b', 'c'],
    why_this: 'W', ...over,
  }],
});

describe('clampCopy: never show the creator a cut-off word', () => {
  it('leaves short copy untouched', () => {
    const t = 'The Cooker & Kadai Cake Book: 12 Eggless Cakes, No Oven';
    expect(clampCopy(mk({ title: t })).products[0].title).toBe(t);
  });

  // Found by a real seeded sample: "1:1 Physics Doubt Audit: Find Exactly
  // Where You Keep Losing Marks" was cut to "...Find Exactly Where You Keep",
  // because the colon in "1:1" was the first boundary found and was rejected
  // as too short, so the real boundary was never considered.
  it('ignores a too-short early boundary and uses the real one', () => {
    const out = clampCopy(mk({
      title: '1:1 Physics Doubt Audit: Find Exactly Where You Keep Losing Marks',
    })).products[0].title;
    expect(out).toBe('1:1 Physics Doubt Audit');
    expect(out.length).toBeLessThanOrEqual(60);
  });

  it('cuts an over-long title at its colon, keeping a complete title', () => {
    const out = clampCopy(mk({
      title: 'Cups, Spoons & Katoris: The No-Weighing-Scale Measuring Guide For Home Bakers',
    })).products[0].title;
    expect(out).toBe('Cups, Spoons & Katoris');
    expect(out.length).toBeLessThanOrEqual(60);
  });

  it('never leaves a dangling conjunction', () => {
    const out = clampCopy(mk({
      points: ['A clear walkthrough of what most likely went wrong in your cooker or kadai setup, and how to fix it', 'b', 'c'],
    })).products[0].points[0];
    expect(out).not.toMatch(/\b(and|or|with|using|just|the|to)$/i);
    expect(out).not.toMatch(/[,;:\s-]$/);
  });

  it('keeps every field inside its published limit', () => {
    const long = 'x '.repeat(200);
    const out = clampCopy(mk({ title: long, promise: long, points: [long, long, long], why_this: long })).products[0];
    expect(out.title.length).toBeLessThanOrEqual(60);
    expect(out.promise.length).toBeLessThanOrEqual(90);
    out.points.forEach((p) => expect(p.length).toBeLessThanOrEqual(90));
    expect(out.why_this.length).toBeLessThanOrEqual(200);
  });

  it('caps the bio at 150 characters', () => {
    expect(clampCopy({ ...mk({}), bio: 'y '.repeat(200) }).bio.length).toBeLessThanOrEqual(150);
  });

  it('leaves the description alone: its 40-80 word rule is a gate, not a trim', () => {
    const d = Array.from({ length: 65 }, (_, i) => `w${i}`).join(' ');
    expect(wordCount(clampCopy(mk({ description: d })).products[0].description)).toBe(65);
  });

  it('keeps exactly three points', () => {
    expect(clampCopy(mk({ points: ['a', 'b', 'c', 'd', 'e'] })).products[0].points).toHaveLength(3);
  });
});

describe('clampCopy: dangling modifiers after a trim', () => {
  it('does not end a promise on a determiner waiting for a noun', () => {
    // Real output, seen on a live draft: the trim cut the noun and left
    // "...without any special", which reads as a truncation bug to the
    // creator even though nothing is broken.
    const promise =
      'Brew strong South Indian filter coffee at home every morning without any special equipment or expensive gear';
    const out = clampCopy(mk({ promise })).products[0].promise;
    expect(out.length).toBeLessThanOrEqual(90);
    expect(out).not.toMatch(/\b(any|the|a|an|your|some|special|other|more|very)$/i);
  });

  it('strips several stacked dangling words, not just one', () => {
    const promise =
      'Learn to read a balance sheet before you invest in any single new company that you have not yet researched';
    const out = clampCopy(mk({ promise })).products[0].promise;
    expect(out).not.toMatch(/\b(in|any|single|new|that|the)$/i);
  });

  it('still keeps a promise that ends on a real word', () => {
    const promise = 'Bake eggless cakes in your pressure cooker, no oven needed.';
    expect(clampCopy(mk({ promise })).products[0].promise).toBe(promise);
  });
});
