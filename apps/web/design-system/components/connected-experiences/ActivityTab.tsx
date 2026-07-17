'use client';

import { useEffect } from 'react';
import { useConnectedExperiences } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { domainErrorCopy } from '../domain-error-copy';
import { formatActivityEventType, formatActor } from './connected-experiences-format';
import styles from './ActivityTab.module.css';

/**
 * Steward Activity — the append-only audit trail (DOMAIN-008 Founder
 * Decision 5), the foundation for a future Trust Center. Every connection,
 * revocation, upload, summarization, and deletion appears here with who
 * did it, so a member never has to wonder what happened to their data.
 */
export function ActivityTab() {
  const connectedExperiences = useConnectedExperiences();
  const { state } = connectedExperiences;

  useEffect(() => {
    void connectedExperiences.loadActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedExperiences.loadActivity]);

  if (state.isLoadingActivity && state.activity.length === 0) {
    return <LoadingState label="Loading activity" />;
  }

  if (state.error && state.activity.length === 0) {
    const copy = domainErrorCopy(state.error.kind);
    return <ErrorState title={copy.title} description={copy.description} />;
  }

  if (state.activity.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Connections, uploads, and summaries will appear here as they happen."
      />
    );
  }

  return (
    <ul className={styles.list}>
      {state.activity.map((entry) => (
        <li key={entry.id} className={styles.item}>
          <div>
            <p className={styles.description}>{entry.description}</p>
            <p className={styles.meta}>
              {formatActor(entry.actor)} · {formatActivityEventType(entry.eventType)} ·{' '}
              {new Date(entry.occurredAt).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
