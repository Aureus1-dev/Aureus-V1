import { Button } from '../../Button/Button';
import { LoadingState } from '../../LoadingState/LoadingState';
import { ErrorState } from '../../ErrorState/ErrorState';
import { domainErrorCopy } from '../../domain-error-copy';
import type { ArrivalError } from '../classify-arrival-error';
import styles from './ConsentStep.module.css';

export interface ConsentStepProps {
  granting: boolean;
  error: ArrivalError | null;
  onGrant: () => void;
  onRetry: () => void;
}

/**
 * B3 (Gate B — The Gate): a member cannot proceed past arrival without
 * giving required consent and seeing what to expect from Aureus. The
 * record is retrievable later via GET /users/:userId/consent.
 */
export function ConsentStep({ granting, error, onGrant, onRetry }: ConsentStepProps) {
  if (granting) {
    return (
      <div className={styles.step}>
        <LoadingState label="Recording your consent" />
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

  return (
    <div className={styles.step}>
      <h1 className={styles.title}>Before we begin</h1>
      <p className={styles.body}>
        Aureus listens to what you share and remembers it so you never have to repeat yourself. You can view,
        correct, or forget anything Aureus remembers about you at any time, and export it as a readable file.
      </p>
      <p className={styles.body}>
        A named human steward may see what you share here in order to help you — never sold, never used to
        advertise to you.
      </p>
      <p className={styles.body}>
        If something urgent comes up, use the Urgent help button present on every screen for real, immediate
        crisis resources — this does not replace calling 911 in an emergency.
      </p>
      <Button onClick={onGrant}>I understand — continue</Button>
    </div>
  );
}
