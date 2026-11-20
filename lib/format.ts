/**
 * Formatting shared by server and client components.
 *
 * Deliberately not in components/ui.tsx: that module is 'use client', and a
 * server component calling into it throws at render time.
 */

/** Indian digit grouping: ₹1,99,999 rather than ₹199,999. */
export const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;
