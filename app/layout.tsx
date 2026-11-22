import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';

// Body. Geist replaces Inter per the design handoff.
const sans = Geist({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

// Display: headings, prices, the wordmark.
const display = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

// Creators write in Hindi and Hinglish and the generated bio is often
// mixed script. Neither Geist nor Bricolage covers Devanagari, so it is
// loaded separately and sits behind both in the font stack. The previous
// comment claimed Inter carried a Devanagari subset; it does not, so
// Hindi text was silently falling back to a system face.
const deva = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600'],
  variable: '--font-deva',
  display: 'swap',
});

export const metadata: Metadata = {
  // Without this, OG image URLs resolve against localhost in production
  // and link previews silently break once deployed.
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'),
  title: 'Turn your Instagram into a storefront',
  description:
    'Give us your handle or a line about what you teach. We draft a bio, '
    + 'two to four things you could sell, and INR prices you can change.',
};

// Mobile-first: the whole product is used on a phone.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#FBF9F5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${deva.variable}`}>
      <body className="min-h-dvh bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
