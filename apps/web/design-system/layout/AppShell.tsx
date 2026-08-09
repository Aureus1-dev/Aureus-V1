'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { primarySurfaces } from '../navigation/surfaces';
import { useSession } from '../../state';
import { RoomTransition } from './RoomTransition';
import { StewardPanel } from '../components/steward-panel';
import { GuestClaimBanner } from '../components/guest';
import { LivingHallEnvironment, hallRoomForPath } from '../components/living-hall';
import styles from './AppShell.module.css';

export interface AppShellProps {
  children: ReactNode;
}

const FOUNDER_ROLES = ['PLATFORM_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'];
const SOUND_PREFERENCE_KEY = 'aureus-hall-sound';

function isActiveSurface(pathname: string | null, href: string): boolean {
  return Boolean(pathname && (pathname === href || pathname.startsWith(`${href}/`)));
}

/**
 * A single, persistent Hall. Navigation is an index the member opens when
 * needed, not a dashboard wrapped around every moment. Route changes alter
 * the room's light and working surface while the architecture stays still.
 */
export function AppShell({ children }: AppShellProps) {
  const { session } = useSession();
  const pathname = usePathname();
  const [indexOpen, setIndexOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const isFounder = session.roles.some((role) => FOUNDER_ROLES.includes(role));
  const room = hallRoomForPath(pathname);

  useEffect(() => {
    setSoundEnabled(window.localStorage.getItem(SOUND_PREFERENCE_KEY) === 'on');
  }, []);

  useEffect(() => {
    setIndexOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!indexOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIndexOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [indexOpen]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    window.localStorage.setItem(SOUND_PREFERENCE_KEY, next ? 'on' : 'off');
  };

  return (
    <div className={styles.shell}>
      <LivingHallEnvironment room={room.id} soundEnabled={soundEnabled} />

      <header className={styles.header}>
        <button
          type="button"
          className={styles.indexButton}
          aria-expanded={indexOpen}
          aria-controls="hall-index"
          onClick={() => setIndexOpen((open) => !open)}
        >
          <span aria-hidden="true">☰</span>
          <span>Index</span>
        </button>
        <Link href="/conversation" className={styles.brand}>
          Aureus
        </Link>
        <button
          type="button"
          className={styles.soundButton}
          aria-pressed={soundEnabled}
          onClick={toggleSound}
        >
          Sound {soundEnabled ? 'on' : 'off'}
        </button>
      </header>

      {indexOpen ? (
        <>
          <button
            className={styles.drawerBackdrop}
            aria-label="Close the Hall index"
            onClick={() => setIndexOpen(false)}
          />
          <nav id="hall-index" className={styles.drawer} aria-label="The Hall index">
            <div className={styles.drawerHeader}>
              <p>Where would you like to go?</p>
              <button type="button" onClick={() => setIndexOpen(false)}>
                Close
              </button>
            </div>
            <ul className={styles.navList}>
              {primarySurfaces.map((surface) => (
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
                  <Link href="/founder" className={styles.navLink}>
                    Founder
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
        </>
      ) : null}

      <p key={room.id} className={styles.roomLabel} aria-live="polite">
        {room.label}
      </p>
      <div className={styles.claim}>
        <GuestClaimBanner />
      </div>

      <div className={styles.workspace}>
        <main id="main-content" className={styles.main} tabIndex={-1}>
          <RoomTransition pathname={pathname}>{children}</RoomTransition>
        </main>
        <div className={styles.panelRegion}>
          <StewardPanel />
        </div>
      </div>
    </div>
  );
}
