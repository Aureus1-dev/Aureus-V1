import type { VoiceTurnState } from '../../../state';
import styles from './VoiceOrb.module.css';

export interface VoiceOrbProps {
  turnState: VoiceTurnState;
}

const STATE_CLASS: Record<VoiceTurnState, string> = {
  idle: styles.idle,
  connecting: styles.connecting,
  listening: styles.listening,
  thinking: styles.thinking,
  speaking: styles.speaking,
  ended: styles.idle,
};

/**
 * The steward's visual presence during live conversation (AFX-003 §2, §10:
 * "reduce anxiety rather than increase it... a trusted steward sitting
 * beside the member — not software demanding attention"). Deliberately a
 * calm, state-driven breathing pulse rather than an audio-reactive
 * waveform — presence, not a performance. Purely decorative; the
 * accompanying `VoiceStateLabel` carries the same information to
 * assistive technology.
 */
export function VoiceOrb({ turnState }: VoiceOrbProps) {
  return (
    <div className={styles.wrapper} aria-hidden="true">
      <div className={styles.ring} />
      <div className={`${styles.orb} ${STATE_CLASS[turnState]}`} />
    </div>
  );
}
