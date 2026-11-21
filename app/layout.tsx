import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// Devanagari subset included: creators write in Hindi and Hinglish, and
// the bio is often mixed script.
const sans = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
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
    <html lang="en" className={sans.variable}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}
