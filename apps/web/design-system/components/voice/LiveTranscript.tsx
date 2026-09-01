'use client';

import type { VoiceTranscriptEntry } from '../../../state';
import { VisuallyHidden } from '../../accessibility';
import styles from './LiveTranscript.module.css';

export interface LiveTranscriptProps {
  entries: VoiceTranscriptEntry[];
}

export function LiveTranscript({ entries }: LiveTranscriptProps) {
  if (entries.length === 0) return null;
  const last = entries[entries.length - 1];
  // Match the text Hall semantics: when the member has started a new turn
  // and Aureus has not answered yet, show that turn alone. Otherwise the
  // previous Steward answer could appear to answer the new request.
  const currentEntries = last.role === 'member' ? [last] : entries.slice(-2);

  return (
    <div
      className={styles.transcript}
      role="log"
      aria-live="polite"
      aria-label="Live conversation captions"
    >
      {currentEntries.map((entry) => (
        <div
          key={entry.id}
          className={[styles.entry, entry.role === 'member' ? styles.member : styles.steward].join(' ')}
        >
          <VisuallyHidden>{entry.role === 'member' ? 'You said' : 'Your steward said'}</VisuallyHidden>
          <p className={styles.caption}>
            {entry.content || (entry.status === 'streaming' ? '…' : '')}
            {entry.status === 'interrupted' ? (
              <span className={styles.interruptedTag}> (interrupted)</span>
            ) : null}
          </p>
        </div>
      ))}
    </div>
  );
}
