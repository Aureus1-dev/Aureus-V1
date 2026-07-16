'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useVoice } from '../../../state';
import { VoiceOrb } from './VoiceOrb';
import { VoiceStateLabel } from './VoiceStateLabel';
import { Button } from '../Button/Button';
import { VisuallyHidden } from '../../accessibility';
import styles from './PersistentVoicePresence.module.css';

const LIVE_STATES = new Set(['connecting', 'listening', 'thinking', 'speaking']);

/**
 * "A trusted guide walking beside the member" (DOMAIN-005 Founder
 * Decision 3) — a small, calm presence shown on every authenticated
 * screen once a voice session is live, so the conversation is never
 * silently abandoned just because the member navigated elsewhere.
 * Hidden on `/conversation` itself, where the full `VoiceSurface`
 * already shows everything this summarizes.
 */
export function PersistentVoicePresence() {
  const pathname = usePathname();
  const { state, setMuted, interrupt, endSession } = useVoice();

  if (pathname?.startsWith('/conversation')) return null;
  if (!LIVE_STATES.has(state.turnState)) return null;

  return (
    <div className={styles.presence} role="status" aria-live="polite">
      <div className={styles.orb}>
        <VoiceOrb turnState={state.turnState} />
      </div>

      <div className={styles.info}>
        <VoiceStateLabel turnState={state.turnState} />
        <Link href="/conversation" className={styles.link}>
          Open conversation
        </Link>
      </div>

      <div className={styles.controls}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setMuted(!state.muted)}
          aria-pressed={state.muted}
          className={styles.control}
        >
          {state.muted ? 'Unmute' : 'Mute'}
          <VisuallyHidden>{state.muted ? 'Microphone is muted' : 'Microphone is live'}</VisuallyHidden>
        </Button>

        {state.turnState === 'speaking' ? (
          <Button type="button" variant="secondary" onClick={interrupt} className={styles.control}>
            Interrupt
            <VisuallyHidden>Stop your steward and speak</VisuallyHidden>
          </Button>
        ) : null}

        <Button type="button" variant="secondary" onClick={() => void endSession()} className={styles.control}>
          End
          <VisuallyHidden>End the voice conversation</VisuallyHidden>
        </Button>
      </div>
    </div>
  );
}
