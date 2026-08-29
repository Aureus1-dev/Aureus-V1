'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../../state';
import * as harvestApi from '../../../lib/api/harvest';
import type { HarvestProfileReviewItem } from '../../../lib/api/harvest';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { LoadingState } from '../LoadingState/LoadingState';
import styles from './HarvestReviewQueuePanel.module.css';

export function HarvestReviewQueuePanel() {
  const { session } = useSession();
  const accessToken = session.accessToken;
  const [items, setItems] = useState<HarvestProfileReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(false);
    try {
      setItems(await harvestApi.listHarvestProfileReviewQueue(accessToken));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function update(
    item: HarvestProfileReviewItem,
    legalStatus: harvestApi.HarvestLegalStatus,
  ) {
    if (!accessToken) return;
    setBusyId(item.offerProfileId);
    setError(false);
    try {
      await harvestApi.updateHarvestProfileFromReview(
        accessToken,
        item,
        legalStatus,
        new Date().toISOString(),
      );
      await load();
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  if (loading && items.length === 0) {
    return <LoadingState label="Checking Annual Harvest review queue" />;
  }

  return (
    <section className={styles.panel}>
      <div>
        <h1 className={styles.title}>Annual Harvest review</h1>
        <p className={styles.intro}>
          No profile becomes fresh merely because this screen is open. Reopen
          the exact terms and license source before confirming an unchanged
          profile. If anything is uncertain, block it.
        </p>
      </div>

      {error ? (
        <ErrorState
          title="The Harvest review queue could not be updated"
          description="Nothing was changed. Recheck the source and try again."
          action={<Button onClick={() => void load()}>Try again</Button>}
        />
      ) : null}

      {!loading && items.length === 0 ? (
        <EmptyState
          title="No Harvest profiles need review"
          description="No stale, expired, blocked, or otherwise non-runnable profile is currently queued."
        />
      ) : (
        <ul className={styles.list}>
          {items.map((item) => {
            const busy = busyId === item.offerProfileId;
            return (
              <li key={item.offerProfileId}>
                <Card className={styles.card}>
                  <div className={styles.header}>
                    <div>
                      <h2>{item.title}</h2>
                      <p>{item.provider} · profile v{item.profileVersion}</p>
                    </div>
                    <strong>{item.legalStatus}</strong>
                  </div>

                  <ul className={styles.reasons}>
                    {item.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>

                  <p className={styles.meta}>
                    Terms last reviewed {new Date(item.termsVerifiedAt).toLocaleString()}
                    {item.expiresAt ? (
                      <span> · expires {new Date(item.expiresAt).toLocaleString()}</span>
                    ) : null}
                  </p>

                  <div className={styles.links}>
                    <a href={item.termsSourceUrl} target="_blank" rel="noopener noreferrer">
                      Open exact terms
                    </a>
                    <a href={item.licenseSourceUrl} target="_blank" rel="noopener noreferrer">
                      Open license source
                    </a>
                  </div>

                  <div className={styles.actions}>
                    <Button
                      type="button"
                      disabled={busy || item.legalStatus !== 'VERIFIED_REGULATED'}
                      onClick={() => void update(item, 'VERIFIED_REGULATED')}
                    >
                      Confirm unchanged after review
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void update(item, 'BLOCKED')}
                    >
                      Block this profile
                    </Button>
                  </div>

                  <p className={styles.warning}>
                    If the promotion economics or terms changed, do not use
                    “Confirm unchanged.” Leave it blocked/review-required until
                    the full profile values are updated.
                  </p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
