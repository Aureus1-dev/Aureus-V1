'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { SkipLink } from '../accessibility';
import { primarySurfaces } from '../navigation/surfaces';
import { useSession } from '../../state';
import styles from './AppShell.module.css';

export interface AppShellProps {
  children: ReactNode;
}

const FOUNDER_ROLES = ['PLATFORM_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'];

/**
 * Conversation-primary responsive shell (FPB-002 §4, FPB-012). Every
 * screen renders inside this shell so navigation, landmarks, and layout
 * behavior stay consistent across all 20 surfaces. The Founder Operating
 * System (PR-003) is deliberately not one of those 20 — it's an
 * administrative tool, not a member experience — so its nav entry is
 * appended conditionally rather than added to `primarySurfaces`, and only
 * ever renders for a Platform or System Administrator.
 */
export function AppShell({ children }: AppShellProps) {
  const { session } = useSession();
  const isFounder = session.roles.some((role) => FOUNDER_ROLES.includes(role));

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
          {isFounder ? (
            <li>
              <Link href="/founder" className={styles.navLink}>
                Founder
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
