'use client';

import type { CoordinatedPlanDto, PlanItemDto } from '../../../../lib/api/plan';
import type { PlanError } from '../../../../state';
import type { RecommendationSubject } from '../../recommendations';
import type { ResourceOfferResponseValue } from '../../../../lib/api/needs';
import { Button } from '../../Button/Button';
import { LoadingState } from '../../LoadingState/LoadingState';
import { EmptyState } from '../../EmptyState/EmptyState';
import { ErrorState } from '../../ErrorState/ErrorState';
import { domainErrorCopy } from '../../domain-error-copy';
import { PlanCard, planItemKey } from '../../plan/PlanCard';
import styles from './CoordinatedPlanStep.module.css';

export interface CoordinatedPlanStepProps {
  plan: CoordinatedPlanDto | null;
  building: boolean;
  error: PlanError | null;
  subjectsById: Record<string, RecommendationSubject>;
  offerResponseByCityResourceId: Record<string, ResourceOfferResponseValue>;
  isDeciding: (item: PlanItemDto) => boolean;
  onApprove: (item: PlanItemDto) => void;
  onDismiss: (item: PlanItemDto) => void;
  onRetry: () => void;
  onContinue: () => void;
}

function subjectFor(item: PlanItemDto, subjectsById: Record<string, RecommendationSubject>): RecommendationSubject | null {
  if (item.source !== 'RECOMMENDATION') return null;
  return subjectsById[item.recommendation!.id] ?? null;
}

function offerResponseFor(
  item: PlanItemDto,
  offerResponseByCityResourceId: Record<string, ResourceOfferResponseValue>,
): ResourceOfferResponseValue | null {
  if (item.source !== 'CITY_RESOURCE') return null;
  return offerResponseByCityResourceId[item.cityResource!.id] ?? null;
}

/**
 * The Coordinated Plan (Member Arrival — Steward Experience migration).
 * Never a search-results list: one Primary next step, only genuinely
 * useful Supporting steps, and one plain-language explanation of why —
 * built server-side by `AiOrchestratorService.viaCoordinatedPlan()` from
 * every relevant Aureus system already searched in parallel. Deciding on
 * any item still goes through that item's own real, unmodified approval
 * mechanism (`PlanCard`) — this step only presents the plan Aureus already
 * assembled.
 */
export function CoordinatedPlanStep({
  plan,
  building,
  error,
  subjectsById,
  offerResponseByCityResourceId,
  isDeciding,
  onApprove,
  onDismiss,
  onRetry,
  onContinue,
}: CoordinatedPlanStepProps) {
  if (building) {
    return (
      <div className={styles.step}>
        <LoadingState label="Coordinating your plan" />
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

  if (!plan) {
    return (
      <div className={styles.step}>
        <EmptyState
          title="Nothing to coordinate yet"
          description="That's alright — you can always ask your steward in conversation, or continue for now."
          action={<Button onClick={onContinue}>Continue</Button>}
        />
      </div>
    );
  }

  return (
    <div className={styles.step}>
      <h2 className={styles.title}>Here&apos;s what Aureus put together</h2>
      <p className={styles.body}>{plan.combinedRationale}</p>

      <PlanCard
        item={plan.primary}
        role="Primary"
        subject={subjectFor(plan.primary, subjectsById)}
        offerResponse={offerResponseFor(plan.primary, offerResponseByCityResourceId)}
        deciding={isDeciding(plan.primary)}
        onApprove={() => onApprove(plan.primary)}
        onDismiss={() => onDismiss(plan.primary)}
      />

      {plan.supporting.length > 0 ? (
        <div className={styles.supportingList}>
          {plan.supporting.map((item) => (
            <PlanCard
              key={planItemKey(item)}
              item={item}
              role="Supporting"
              subject={subjectFor(item, subjectsById)}
              offerResponse={offerResponseFor(item, offerResponseByCityResourceId)}
              deciding={isDeciding(item)}
              onApprove={() => onApprove(item)}
              onDismiss={() => onDismiss(item)}
            />
          ))}
        </div>
      ) : null}

      {plan.additionalPossibilitiesCount > 0 ? (
        <p className={styles.more}>
          Aureus found {plan.additionalPossibilitiesCount} more real{' '}
          {plan.additionalPossibilitiesCount > 1 ? 'possibilities' : 'possibility'} — ask your steward in conversation any time
          you&apos;d like to see them.
        </p>
      ) : null}

      <Button onClick={onContinue}>Continue</Button>
    </div>
  );
}
