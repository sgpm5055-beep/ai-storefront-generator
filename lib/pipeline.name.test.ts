import { describe, it, expect } from 'vitest';
import { chooseName } from './pipeline';

describe('chooseName: whose name goes on a real person\'s page', () => {
  it('keeps the verified Instagram name over a company in the bio', () => {
    // @ankurwarikoo: bio opens "Founder: WebVeda", so the model guessed
    // "WebVeda" and it replaced the real name on the storefront.
    expect(chooseName('WebVeda', 'Ankur Warikoo', 'ankurwarikoo'))
      .toBe('Ankur Warikoo');
  });

  it('keeps the scraped name even when the guess looks name-shaped', () => {
    expect(chooseName('Flying Beast', 'Gaurav Taneja', 'taneja.gaurav'))
      .toBe('Gaurav Taneja');
  });

  it('falls back to the guess when the scrape only echoed the handle', () => {
    expect(chooseName('Shivesh Bhatia', 'shivesh17', 'shivesh17'))
      .toBe('Shivesh Bhatia');
  });

  it('uses the guess on the description path, where nothing was scraped', () => {
    expect(chooseName('Meera Iyer', '', null)).toBe('Meera Iyer');
  });

  it('ignores a guess that is a sentence rather than a name', () => {
    expect(chooseName('The bio does not mention a name', '', null)).toBe('');
    expect(chooseName('a'.repeat(50), '', null)).toBe('');
  });

  it('handles a missing guess', () => {
    expect(chooseName(null, 'Kabita Singh', 'kabitaskitchen')).toBe('Kabita Singh');
    expect(chooseName(undefined, '', null)).toBe('');
  });

  it('is case-insensitive when comparing to the handle', () => {
    expect(chooseName('Real Name', 'ShivesH17', 'shivesh17')).toBe('Real Name');
  });
});
