'use client';

import { useEffect } from 'react';
import { useStewardshipOversight } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { EmptyState } from '../EmptyState/EmptyState';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import styles from './StewardshipOversightPanel.module.css';

/**
 * The Founder Operating System's Stewardship Oversight panel (PR-003) —
 * the platform-wide steward roster with each steward's own performance
 * metrics (reused verbatim from `StewardMetricsService`, PA-012), and the
 * unscoped relationship roster an Administrator already sees.
 */
export function StewardshipOversightPanel() {
  const { state, load } = useStewardshipOversight();

  useEffect(() => {
    void load();
  }, [load]);

  if (state.isLoading && state.stewards.length === 0) {
    return (
      <div className={styles.loading}>
        <LoadingState label="Preparing stewardship oversight" />
      </div>
    );
  }

  if (state.error && state.stewards.length === 0) {
    return (
      <ErrorState
        title="Stewardship oversight couldn't be loaded"
        description={state.error.message}
        action={state.error.retryable ? <Button onClick={() => void load()}>Try again</Button> : undefined}
      />
    );
  }

  return (
    <div className={styles.panel}>
      <h1 className={styles.title}>Stewardship Oversight</h1>
      <p className={styles.intro}>The platform-wide steward roster and relationship overview.</p>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Stewards</h2>
        {state.stewards.length === 0 ? (
          <EmptyState title="No stewards yet" description="No user currently holds the Steward role." />
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Steward</th>
                  <th scope="col">Active members</th>
                  <th scope="col">Capacity</th>
                  <th scope="col">Tasks completed</th>
                  <th scope="col">Escalations resolved</th>
                </tr>
              </thead>
              <tbody>
                {state.stewards.map((steward) => {
                  const metrics = state.metricsByStewardId[steward.id];
                  return (
                    <tr key={steward.id}>
                      <td>{steward.email}</td>
                      <td>{metrics ? metrics.activeMemberCount : '—'}</td>
                      <td>{metrics ? metrics.capacity : '—'}</td>
                      <td>{metrics ? metrics.tasksCompleted : '—'}</td>
                      <td>{metrics ? metrics.escalationsResolved : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className={styles.card}>
        <h2 className={styles.sectionTitle}>Relationships ({state.relationshipsTotal})</h2>
        {state.relationships.length === 0 ? (
          <EmptyState title="No relationships yet" description="No Stewardship relationship has been created." />
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Steward</th>
                  <th scope="col">Status</th>
                  <th scope="col">Origin</th>
                </tr>
              </thead>
              <tbody>
                {state.relationships.map((relationship) => (
                  <tr key={relationship.id}>
                    <td>{relationship.memberId}</td>
                    <td>{relationship.stewardId ?? '—'}</td>
                    <td>{relationship.status}</td>
                    <td>{relationship.origin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
