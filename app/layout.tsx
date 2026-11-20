import type { Metadata, Viewport } from 'next';
import './globals.css';

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
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
