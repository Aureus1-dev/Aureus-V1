import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aureus V1',
  description: 'Aureus V1 monorepo foundation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
