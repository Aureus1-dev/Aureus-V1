'use client';

import type { PeopleResponsibilityDto } from '../../../lib/api/people-help';
import { Button } from '../Button/Button';
import { describeReportedOutcome, describeResponsibilityStatus } from './responsibility-carry-state';
import styles from './ResponsibilityProgressCard.module.css';

export interface ResponsibilityProgressCardProps {
  responsibility: PeopleResponsibilityDto;
  busy?: boolean;
  onResume?: () => void;
}

export function ResponsibilityProgressCard({
  responsibility,
  busy = false,
  onResume,
}: ResponsibilityProgressCardProps) {
  const outcome = describeReportedOutcome(responsibility);
  const canResume =
    (responsibility.status === 'WAITING_ON_USER' ||
      responsibility.status === 'ACTIVE') &&
    Boolean(responsibility.originOpportunityId) &&
    Boolean(onResume);

  return (
    <section className={styles.card} aria-label="Aureus responsibility progress">
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>Aureus is carrying this with you</p>
          <h2 className={styles.title}>{responsibility.objective}</h2>
        </div>
        <span className={styles.private}>Private to your Aureus account</span>
      </div>

      <p className={styles.status}>{describeResponsibilityStatus(responsibility.status)}</p>

      {outcome ? <p className={styles.outcome}>{outcome}</p> : null}

      <p className={styles.boundary}>
        Aureus can guide you through the application. You remain in control of
        what you enter, attest to, and submit.
      </p>

      {canResume ? (
        <Button type="button" disabled={busy} onClick={onResume}>
          Continue with Aureus
        </Button>
      ) : null}
    </section>
  );
}
