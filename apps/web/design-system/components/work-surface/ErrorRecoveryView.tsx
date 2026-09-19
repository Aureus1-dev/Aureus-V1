import { ErrorState } from '../ErrorState/ErrorState';
import { Button } from '../Button/Button';
import styles from './ErrorRecoveryView.module.css';

export interface ErrorRecoveryViewProps {
  onRetry: () => void;
}

/**
 * Error/recovery state (portfolio §6 State C area; a required Slice 0
 * state on its own). Errors preserve the member's place and work
 * wherever possible — retrying returns to the exact view (and matter
 * state) the member was in, never a reset to arrival.
 */
export function ErrorRecoveryView({ onRetry }: ErrorRecoveryViewProps) {
  return (
    <div className={styles.wrap}>
      <ErrorState
        title="Something went wrong on our side"
        description="Your place and everything Aureus was carrying are still here. Let's try again."
        action={
          <Button type="button" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    </div>
  );
}
