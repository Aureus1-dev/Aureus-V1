'use client';

import { useEffect, useRef } from 'react';
import type { VoiceTranscriptEntry } from '../../../state';
import { VisuallyHidden } from '../../accessibility';
import styles from './LiveTranscript.module.css';

export interface LiveTranscriptProps {
  entries: VoiceTranscriptEntry[];
}

/**
 * Spoken content rendered as text (AFX-003 §7: visual elements support
 * understanding). This is not a nice-to-have caption — it is how a Deaf
 * or hard-of-hearing member follows a voice conversation at all, so the
 * region is `aria-live` the same as the audio is live, not an
 * afterthought bolted onto an audio-only experience.
 */
export function LiveTranscript({ entries }: LiveTranscriptProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [entries]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={styles.transcript} role="log" aria-live="polite" aria-label="Live conversation transcript">
      {entries.map((entry) => (
        <div key={entry.id} className={`${styles.entry} ${entry.role === 'member' ? styles.member : styles.steward}`}>
          <VisuallyHidden>{entry.role === 'member' ? 'You said' : 'Your steward said'}</VisuallyHidden>
          <p className={styles.bubble}>
            {entry.content || (entry.status === 'streaming' ? '…' : '')}
            {entry.status === 'interrupted' ? <span className={styles.interruptedTag}> (interrupted)</span> : null}
          </p>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
