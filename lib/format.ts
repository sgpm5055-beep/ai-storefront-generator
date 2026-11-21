/**
 * Formatting shared by server and client components.
 *
 * Deliberately not in components/ui.tsx: that module is 'use client', and a
 * server component calling into it throws at render time.
 */

/** Indian digit grouping: ₹1,99,999 rather than ₹199,999. */
export const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

/**
 * The name to greet someone by, or null if there isn't a safe one.
 *
 * Instagram display names are not first names. Real examples from testing:
 * "Shekhar's Figo" (a car account) would greet "Shekhar's", and a name that
 * is an emoji, a handle or a brand reads worse addressed personally than
 * not at all. When in doubt, return null and let the caller drop the
 * greeting rather than print something that looks like a bug.
 */
export function firstName(full: string | null | undefined): string | null {
  if (!full) return null;
  const first = full.trim().split(/\s+/)[0] ?? '';
  // Strip trailing possessives and punctuation: "Shekhar's" -> "Shekhar".
  // U+2019 is the apostrophe Instagram actually stores, not U+0027.
  const word = first.replace(/[\u0027\u2018\u2019`]s$/i, '')
    .replace(/^[^\p{L}]+|[^\p{L}\p{M}]+$/gu, '');
  if (word.length < 2 || word.length > 20) return null;
  // Must be mostly letters: rejects "x_x", "404", emoji-only names.
  // \p{M} counts combining marks, or every Devanagari vowel sign fails.
  const letters = (word.match(/[\p{L}\p{M}]/gu) ?? []).length;
  return letters / word.length >= 0.8 ? word : null;
}
