import type { Metadata } from 'next';
import { ThemeStyle, ThemeProvider } from '../design-system/theme';
import { AppShell } from '../design-system/layout';
import { AppStateProvider } from '../state';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aureus',
  description: 'Aureus — a steward for every member’s journey.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ThemeStyle />
      </head>
      <body>
        <ThemeProvider>
          <AppStateProvider>
            <AppShell>{children}</AppShell>
          </AppStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
