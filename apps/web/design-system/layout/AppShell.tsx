'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { primarySurfaces } from '../navigation/surfaces';
import { useSession } from '../../state';
import { StewardPanel } from '../components/steward-panel';
import styles from './AppShell.module.css';

const FOUNDER_ROLES = ['PLATFORM_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'];

function isActiveSurface(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The transitional application chrome, mounted over the Hall.
 *
 * ── What changed, and why it is temporary ──────────────────────────
 *
 * This was a four-region CSS grid — header, navigation rail, `<main>`,
 * Steward panel — and the Hall rendered *inside* its `<main>` cell on two
 * routes. That is the layer inversion the environment-first redesign
 * exists to correct: DOCUMENT 12, constitutional, states the Hall "is not
 * an application launcher" and that its first design principle is
 * "Architecture before interface"; AUREUS-201 requires an environment
 * that "replaces the traditional concept of application pages".
 *
 * So `<main>` has moved into the room (`HallStage`), and what remains
 * here is only chrome, positioned over the environment rather than
 * containing it. The room runs underneath it, edge to edge, because a
 * wall does not stop at a piece of furniture; only the member's own
 * column steps aside, so nothing they need to read sits behind this.
 *
 * This component is scheduled for removal. The permanent rail
 * contradicts AUREUS-203 — "Traditional navigation controls remain
 * available but should remain secondary" — and the Steward panel is a
 * dashboard, which AUREA-001 forbids outright: "There are no feature
 * dashboards." Both stay mounted only until their architectural
 * replacements are in place, so that navigation is never briefly
 * unreachable for a keyboard or screen-reader member.
 *
 * Everything else is unchanged: the curated `'primary'`-tier surfaces
 * stay visible, every other surface is still a real, working link behind
 * the disclosure, and the Founder Operating System entry is still
 * appended only for a Platform or System Administrator.
 */
export function AppShell() {
  const { session } = useSession();
  const pathname = usePathname();
  const isFounder = session.roles.some((role) => FOUNDER_ROLES.includes(role));
  const primaryTier = primarySurfaces.filter((surface) => surface.tier === 'primary');
  const secondaryTier = primarySurfaces.filter((surface) => surface.tier === 'secondary');

  return (
    <div className={styles.chrome}>
      <header className={styles.header}>
        <Link href="/welcome" className={styles.brand}>
          Aureus
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
      <div className={styles.panelRegion}>
        <StewardPanel />
      </div>
    </div>
  );
}
