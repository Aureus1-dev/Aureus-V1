import type { GoalDto } from '../../../../lib/api/goals';
import type { JourneyError } from '../../../../state';
import { Button } from '../../Button/Button';
import { LoadingState } from '../../LoadingState/LoadingState';
import { ErrorState } from '../../ErrorState/ErrorState';
import { domainErrorCopy } from '../../domain-error-copy';
import styles from './FirstMissionStep.module.css';

export interface FirstMissionStepProps {
  goal: GoalDto | null;
  creating: boolean;
  error: JourneyError | null;
  onRetry: () => void;
  onContinue: () => void;
}

/**
 * Confirms the First Mission — the Goal → Journey → starter Milestone
 * created from the member's immediate need. Creation is 4 sequential,
 * non-transactional backend calls; on failure this offers a retry that
 * resumes from wherever it stopped rather than starting over.
 */
export function FirstMissionStep({ goal, creating, error, onRetry, onContinue }: FirstMissionStepProps) {
  if (creating) {
    return (
      <div className={styles.step}>
        <LoadingState label="Preparing your first mission" />
      </div>
    );
  }

  if (error) {
    const copy = domainErrorCopy(error.kind);
    return (
      <div className={styles.step}>
        <ErrorState
          title={copy.title}
          description={copy.description}
          action={
            error.retryable ? (
              <Button variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  if (!goal) {
    return null;
  }

  return (
    <div className={styles.step}>
      <h2 className={styles.title}>Your first mission is set</h2>
      <p className={styles.body}>
        &quot;{goal.title}&quot; is now your first Goal. We&apos;ve created a Journey to track your progress, with
        one small step ready to begin.
      </p>
      <Button onClick={onContinue}>Continue</Button>
    </div>
  );
}
