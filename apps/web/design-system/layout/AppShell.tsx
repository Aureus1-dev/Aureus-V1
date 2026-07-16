import type { ReactNode } from 'react';
import Link from 'next/link';
import { SkipLink } from '../accessibility';
import { primarySurfaces } from '../navigation/surfaces';
import styles from './AppShell.module.css';

export interface AppShellProps {
  children: ReactNode;
}

/**
 * Conversation-primary responsive shell (FPB-002 §4, FPB-012). Every
 * screen renders inside this shell so navigation, landmarks, and layout
 * behavior stay consistent across all 20 surfaces.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <SkipLink targetId="main-content" />
      <header className={styles.header}>
        <Link href="/welcome" className={styles.brand}>
          Aureus
        </Link>
        <Link href="/conversation" className={styles.returnToConversation}>
          Return to Conversation
        </Link>
      </header>
      <nav className={styles.nav} aria-label="Primary">
        <ul className={styles.navList}>
          {primarySurfaces.map((surface) => (
            <li key={surface.id}>
              <Link href={surface.href} className={styles.navLink}>
                {surface.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
