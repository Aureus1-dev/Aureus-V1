import type { VoiceTurnState } from '../../../state';
import styles from './VoiceStateLabel.module.css';

export interface VoiceStateLabelProps {
  turnState: VoiceTurnState;
}

const LABEL: Record<VoiceTurnState, string> = {
  idle: '',
  connecting: 'Connecting…',
  listening: 'Listening…',
  thinking: 'Your steward is thinking…',
  speaking: 'Your steward is speaking…',
  ended: 'Conversation ended',
};

/**
 * The accessible counterpart to `VoiceOrb` — the same presence
 * information as plain, announced text (AFX-003 §3 "Listening"),
 * mirroring `ThinkingIndicator`'s status-region convention exactly.
 */
export function VoiceStateLabel({ turnState }: VoiceStateLabelProps) {
  const label = LABEL[turnState];
  if (!label) return null;

  return (
    <p className={styles.label} role="status" aria-live="polite">
      {label}
    </p>
  );
}
