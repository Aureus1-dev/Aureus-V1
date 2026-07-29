'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SkipLink } from '../accessibility';
import { primarySurfaces } from '../navigation/surfaces';
import { useSession } from '../../state';
import { RoomTransition } from './RoomTransition';
import styles from './AppShell.module.css';

export interface AppShellProps {
  children: ReactNode;
}

const FOUNDER_ROLES = ['PLATFORM_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'];

function isActiveSurface(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Living Steward Workspace shell (FPB-002 §4, FPB-012 — restyled, not
 * rebuilt, per the Founder-approved visual-shell redesign). Every screen
 * still renders inside this one shell so navigation, landmarks, and layout
 * behavior stay consistent across all 21 surfaces — only the presentation
 * changed. The curated `'primary'`-tier surfaces (Conversation, Journey,
 * Plans, Opportunities, Documents, Community, Calendar, Settings) stay
 * quietly visible; every other surface is still a real, working link,
 * just collapsed behind a disclosure rather than competing for attention
 * (no functionality removed — "collapsed, not removed"). The Founder
 * Operating System (PR-003) is deliberately not one of the 21 surfaces —
 * it's an administrative tool, not a member experience, explicitly left
 * out of this redesign — so its nav entry is appended conditionally and
 * only ever renders for a Platform or System Administrator.
 */
export function AppShell({ children }: AppShellProps) {
  const { session } = useSession();
  const pathname = usePathname();
  const isFounder = session.roles.some((role) => FOUNDER_ROLES.includes(role));
  const primaryTier = primarySurfaces.filter((surface) => surface.tier === 'primary');
  const secondaryTier = primarySurfaces.filter((surface) => surface.tier === 'secondary');

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
          {primaryTier.map((surface) => (
            <li key={surface.id}>
              <Link
                href={surface.href}
                className={styles.navLink}
                aria-current={isActiveSurface(pathname, surface.href) ? 'page' : undefined}
              >
                {surface.label}
              </Link>
            </li>
          ))}
        </ul>
        <details className={styles.navMore}>
          <summary className={styles.navMoreSummary}>More</summary>
          <ul className={styles.navList}>
            {secondaryTier.map((surface) => (
              <li key={surface.id}>
                <Link
                  href={surface.href}
                  className={styles.navLink}
                  aria-current={isActiveSurface(pathname, surface.href) ? 'page' : undefined}
                >
                  {surface.label}
                </Link>
              </li>
            ))}
            {isFounder ? (
              <li>
                <Link
                  href="/founder"
                  className={styles.navLink}
                  aria-current={isActiveSurface(pathname, '/founder') ? 'page' : undefined}
                >
                  Founder
                </Link>
              </li>
            ) : null}
          </ul>
        </details>
      </nav>
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <RoomTransition pathname={pathname}>{children}</RoomTransition>
      </main>
    </div>
  );
}
