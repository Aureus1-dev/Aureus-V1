import type { RecommendationDto } from '../../../../lib/api/recommendations';
import type { RecommendationError } from '../../../../state';
import { Button } from '../../Button/Button';
import { LoadingState } from '../../LoadingState/LoadingState';
import { EmptyState } from '../../EmptyState/EmptyState';
import { ErrorState } from '../../ErrorState/ErrorState';
import { RecommendationCard, type RecommendationSubject } from '../../recommendations';
import { domainErrorCopy } from '../../domain-error-copy';
import styles from './ReviewApprovalStep.module.css';

export interface ReviewApprovalStepProps {
  recommendations: RecommendationDto[];
  subjectsById: Record<string, RecommendationSubject>;
  generating: boolean;
  error: RecommendationError | null;
  isDeciding: (id: string) => boolean;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  onRetry: () => void;
  onContinue: () => void;
}

/**
 * Review & Approval (AFX-001 §10 "Preparation Before Approval"). Aureus
 * has already prepared these; the member decides. Continuing is never
 * gated on deciding every recommendation — pace is the member's choice
 * (AFX-005 §7).
 */
export function ReviewApprovalStep({
  recommendations,
  subjectsById,
  generating,
  error,
  isDeciding,
  onApprove,
  onDismiss,
  onRetry,
  onContinue,
}: ReviewApprovalStepProps) {
  const pending = recommendations.filter((r) => r.status === 'PENDING');

  return (
    <div className={styles.step}>
      <h2 className={styles.title}>Aureus prepared a few recommendations</h2>
      <p className={styles.body}>
        Based on what you shared, here&apos;s what we&apos;d suggest. Nothing happens until you approve it.
      </p>

      {generating ? <LoadingState label="Preparing recommendations" /> : null}

      {error ? (
        <ErrorState
          title={domainErrorCopy(error.kind).title}
          description={domainErrorCopy(error.kind).description}
          action={
            error.retryable ? (
              <Button variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {!generating && !error && pending.length === 0 ? (
        <EmptyState
          title="No recommendations yet"
          description="That's alright — you can always ask your steward in conversation, or continue for now."
        />
      ) : null}

      {pending.length > 0 ? (
        <div className={styles.list}>
          {pending.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              rationale={recommendation.rationale}
              subject={subjectsById[recommendation.id] ?? null}
              deciding={isDeciding(recommendation.id)}
              onApprove={() => onApprove(recommendation.id)}
              onDismiss={() => onDismiss(recommendation.id)}
            />
          ))}
        </div>
      ) : null}

      <Button onClick={onContinue}>Continue</Button>
    </div>
  );
}
