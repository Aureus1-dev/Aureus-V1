'use client';

import { Button } from '../Button/Button';
import { VisuallyHidden } from '../../accessibility';
import type { VoiceTurnState } from '../../../state';
import styles from './VoiceControls.module.css';

export interface VoiceControlsProps {
  turnState: VoiceTurnState;
  muted: boolean;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onEnd: () => void;
}

/**
 * Mute, interrupt, and end controls (Founder Decision: "The member must
 * not press and release a button for every individual utterance" — these
 * are session-level controls, not per-turn ones). `Interrupt` is the
 * explicit, accessible alternative to voice barge-in: a member who
 * cannot reliably speak over the steward can still stop it with a tap.
 */
export function VoiceControls({ turnState, muted, onToggleMute, onInterrupt, onEnd }: VoiceControlsProps) {
  return (
    <div className={styles.controls}>
      <Button type="button" variant="secondary" onClick={onToggleMute} aria-pressed={muted} className={styles.control}>
        {muted ? 'Unmute' : 'Mute'}
        <VisuallyHidden>{muted ? 'Microphone is muted' : 'Microphone is live'}</VisuallyHidden>
      </Button>

      {turnState === 'speaking' ? (
        <Button type="button" variant="secondary" onClick={onInterrupt} className={styles.control}>
          Interrupt
          <VisuallyHidden>Stop your steward and speak</VisuallyHidden>
        </Button>
      ) : null}

      <Button type="button" variant="primary" onClick={onEnd} className={styles.control}>
        End conversation
      </Button>
    </div>
  );
}
