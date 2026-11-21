import { describe, it, expect } from 'vitest';
import { firstName, rupees } from './format';

describe('rupees', () => {
  it('groups in the Indian system', () => {
    expect(rupees(199999)).toBe('₹1,99,999');
  });
});

describe('firstName: who we greet by name', () => {
  it('takes the first word of a real name', () => {
    expect(firstName('Shivesh Bhatia')).toBe('Shivesh');
    expect(firstName('Nikhil Kamath')).toBe('Nikhil');
  });

  it('strips a possessive', () => {
    // Real case: the account "Shekhar's Figo" greeted "Shekhar's".
    expect(firstName("Shekhar's Figo")).toBe('Shekhar');
    expect(firstName('Shekhar’s Figo')).toBe('Shekhar');
  });

  it('returns null rather than greet a non-name', () => {
    expect(firstName('404')).toBeNull();
    expect(firstName('🔥🔥🔥')).toBeNull();
    expect(firstName('x_x')).toBeNull();
    expect(firstName('')).toBeNull();
    expect(firstName(null)).toBeNull();
  });

  it('handles a single-word name', () => {
    expect(firstName('warikoo')).toBe('warikoo');
  });

  it('keeps non-Latin names', () => {
    expect(firstName('शिवेश भाटिया')).toBe('शिवेश');
  });

  it('rejects an absurdly long token', () => {
    expect(firstName('a'.repeat(40))).toBeNull();
  });
});
