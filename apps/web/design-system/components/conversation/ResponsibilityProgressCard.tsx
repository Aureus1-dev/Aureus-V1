'use client';

import type { PeopleResponsibilityDto } from '../../../lib/api/people-help';
import { Button } from '../Button/Button';
import styles from './ResponsibilityProgressCard.module.css';

export interface ResponsibilityProgressCardProps {
  responsibility: PeopleResponsibilityDto;
  busy?: boolean;
  onResume?: () => void;
}

function statusCopy(status: PeopleResponsibilityDto['status']): string {
  switch (status) {
    case 'ACTIVE':
      return 'We are working on this together now.';
    case 'WAITING_ON_USER':
      return 'Paused for you. Come back when you are ready and Aureus will pick it up here.';
    case 'WAITING_ON_AUREUS':
      return 'Aureus has the next step.';
    case 'WAITING_ON_THIRD_PARTY':
      return 'Waiting on an outside party.';
    case 'BLOCKED':
      return 'Aureus found a blocker and is keeping the work visible.';
    case 'COMPLETED':
      return 'This bounded responsibility is complete.';
    case 'RESPONSIBLY_EXHAUSTED':
      return 'No responsible path remains right now.';
    case 'CANCELLED':
      return 'This responsibility was cancelled.';
  }
}

function reportedOutcome(
  responsibility: PeopleResponsibilityDto,
): string | null {
  const completion = [...responsibility.events]
    .reverse()
    .find((event) => event.type === 'COMPLETED');

  if (
    completion?.sourceRecordType !== 'SavedOpportunity' ||
    completion.evidenceLevel !== 'REPORTED' ||
    !completion.sourceState
  ) {
    return null;
  }

  if (completion.sourceState === 'APPLIED') {
    return 'Application status: submitted/applied — reported by you.';
  }

  if (completion.sourceState === 'NOT_INTERESTED') {
    return 'Application status: not continuing — reported by you.';
  }

  return `Application status: ${completion.sourceState} — reported by you.`;
}

export function ResponsibilityProgressCard({
  responsibility,
  busy = false,
  onResume,
}: ResponsibilityProgressCardProps) {
  const outcome = reportedOutcome(responsibility);
  const canResume =
    responsibility.status === 'WAITING_ON_USER' &&
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

      <p className={styles.status}>{statusCopy(responsibility.status)}</p>

      {outcome ? <p className={styles.outcome}>{outcome}</p> : null}

      <p className={styles.boundary}>
        Aureus can guide you through the application. You remain in control of
        what you enter, attest to, and submit.
      </p>

      {canResume ? (
        <Button type="button" disabled={busy} onClick={onResume}>
          Resume with Aureus
        </Button>
      ) : null}
    </section>
  );
}
