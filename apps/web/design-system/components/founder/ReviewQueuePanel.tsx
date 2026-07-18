'use client';

import { useEffect, useState } from 'react';
import { useReviewQueue } from '../../../state';
import type { ReviewDomain } from '../../../lib/api/review-queue';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { EmptyState } from '../EmptyState/EmptyState';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import styles from './ReviewQueuePanel.module.css';

const DOMAIN_LABEL: Record<ReviewDomain, string> = {
  resources: 'Resource',
  organizations: 'Organization',
  opportunities: 'Opportunity',
  knowledge: 'Knowledge Article',
  academy: 'Course',
};

/**
 * The Founder Operating System's Review Queue (PR-003) — one unified
 * verify/reject surface over five domains that each already run their own
 * independent PENDING_REVIEW workflow. Rejecting asks for a reason inline
 * (every domain's reject endpoint requires one) rather than a separate
 * dialog, since this is a single-purpose action, not a multi-step flow.
 */
export function ReviewQueuePanel() {
  const { state, load, verify, reject } = useReviewQueue();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    void load();
  }, [load]);

  function startReject(id: string) {
    setRejectingId(id);
    setReason('');
  }

  function cancelReject() {
    setRejectingId(null);
    setReason('');
  }

  async function confirmReject(domain: ReviewDomain, id: string) {
    await reject(domain, id, reason);
    setRejectingId(null);
    setReason('');
  }

  if (state.isLoading && state.items.length === 0) {
    return (
      <div className={styles.loading}>
        <LoadingState label="Preparing the review queue" />
      </div>
    );
  }

  if (state.error && state.items.length === 0) {
    return (
      <ErrorState
        title="The review queue couldn't be loaded"
        description={state.error.message}
        action={state.error.retryable ? <Button onClick={() => void load()}>Try again</Button> : undefined}
      />
    );
  }

  return (
    <div className={styles.panel}>
      <h1 className={styles.title}>Review Queue</h1>
      <p className={styles.intro}>
        Pending review across Resources, Organizations, Opportunities, Knowledge, and Academy.
      </p>

      {state.items.length === 0 ? (
        <EmptyState title="Nothing pending" description="Every submission across every domain has been reviewed." />
      ) : (
        <ul className={styles.list}>
          {state.items.map((item) => {
            const isSaving = state.updatingId === item.id;
            const isRejecting = rejectingId === item.id;
            return (
              <li key={item.id}>
                <Card className={styles.item}>
                  <div className={styles.itemHeader}>
                    <span className={styles.domainBadge}>{DOMAIN_LABEL[item.domain]}</span>
                    <span className={styles.itemTitle}>{item.title}</span>
                  </div>
                  <p className={styles.itemMeta}>Submitted {new Date(item.createdAt).toLocaleString()}</p>

                  {isRejecting ? (
                    <div className={styles.rejectForm}>
                      <label className={styles.reasonLabel} htmlFor={`reason-${item.id}`}>
                        Rejection reason
                      </label>
                      <textarea
                        id={`reason-${item.id}`}
                        className={styles.reasonInput}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        minLength={10}
                        required
                      />
                      <div className={styles.actions}>
                        <Button
                          type="button"
                          disabled={isSaving || reason.trim().length < 10}
                          onClick={() => void confirmReject(item.domain, item.id)}
                        >
                          {isSaving ? 'Rejecting…' : 'Confirm rejection'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={cancelReject} disabled={isSaving}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.actions}>
                      <Button type="button" disabled={isSaving} onClick={() => void verify(item.domain, item.id)}>
                        {isSaving ? 'Verifying…' : 'Verify'}
                      </Button>
                      <Button type="button" variant="secondary" disabled={isSaving} onClick={() => startReject(item.id)}>
                        Reject
                      </Button>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
