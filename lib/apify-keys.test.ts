import { describe, it, expect, beforeEach } from 'vitest';
import {
  usable, reportExhausted, remainingKeyCount, _resetForTest, _stateForTest,
} from './apify-keys';

describe('usable: when to keep using a key', () => {
  it('uses a key with plenty of headroom', () => {
    expect(usable({ remaining: 4.2, exhausted: false })).toBe(true);
  });

  it('retires a key BEFORE it hits zero', () => {
    // The whole point: swap while the key can still serve the request in
    // flight. A key with 50 cents left is already retired.
    expect(usable({ remaining: 0.5, exhausted: false })).toBe(false);
    expect(usable({ remaining: 0, exhausted: false })).toBe(false);
  });

  it('never reuses a key Apify already refused', () => {
    expect(usable({ remaining: 4.9, exhausted: true })).toBe(false);
  });

  it('tries a key whose quota could not be read', () => {
    // A failed quota check must not take the product down; attempt the
    // scrape and let a 403 retire the key.
    expect(usable({ remaining: null, exhausted: false })).toBe(true);
  });
});

describe('reportExhausted: reacting to a 403', () => {
  beforeEach(() => _resetForTest(['k1', 'k2', 'k3']));

  it('reports another key is available', () => {
    expect(reportExhausted('k1')).toBe(true);
    expect(remainingKeyCount()).toBe(2);
  });

  it('retires the right key and leaves the others alone', () => {
    reportExhausted('k2');
    const s = _stateForTest();
    expect(s.find((k) => k.token === 'k2')?.exhausted).toBe(true);
    expect(s.find((k) => k.token === 'k1')?.exhausted).toBe(false);
    expect(s.find((k) => k.token === 'k3')?.exhausted).toBe(false);
  });

  it('reports when the last key is gone', () => {
    reportExhausted('k1');
    reportExhausted('k2');
    expect(reportExhausted('k3')).toBe(false);
    expect(remainingKeyCount()).toBe(0);
  });

  it('is idempotent: a repeated 403 does not retire a second key', () => {
    reportExhausted('k1');
    reportExhausted('k1');
    expect(remainingKeyCount()).toBe(2);
  });

  it('ignores a token it does not know', () => {
    expect(reportExhausted('not-a-key')).toBe(true);
    expect(remainingKeyCount()).toBe(3);
  });
});

describe('configuration', () => {
  it('reports zero keys when none are configured', () => {
    _resetForTest([]);
    expect(remainingKeyCount()).toBe(0);
  });

  it('supports a single key, as the original setup had', () => {
    _resetForTest(['only']);
    expect(remainingKeyCount()).toBe(1);
    expect(reportExhausted('only')).toBe(false);
  });
});
