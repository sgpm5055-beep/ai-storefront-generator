import { describe, it, expect } from 'vitest';

/**
 * The guard in app/build/[id]/page.tsx. Kept here as a pure test because
 * the bug it encodes was expensive: the page used to also 404 when the
 * store row was not yet readable, and Vercel cached that 404 at the edge,
 * so one request landing in the create/redirect race poisoned the build
 * URL for everyone — including the creator whose build it was.
 */
const isWellFormedBuildId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

describe('build id guard', () => {
  it('accepts a real uuid', () => {
    expect(isWellFormedBuildId('04f50a80-ad5d-4986-bab3-70540f32267c')).toBe(true);
  });

  it('accepts uppercase', () => {
    expect(isWellFormedBuildId('04F50A80-ADD5-4986-BAB3-70540F32267C')).toBe(true);
  });

  it('rejects anything that cannot be a build', () => {
    for (const bad of ['not-a-uuid', '', '../../etc/passwd', '<script>', '123']) {
      expect(isWellFormedBuildId(bad)).toBe(false);
    }
  });
});
