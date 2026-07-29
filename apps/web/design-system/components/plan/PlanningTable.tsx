'use client';

import { useEffect } from 'react';
import { usePlan, useRecommendations, useSession } from '../../../state';
import { useRecommendationSubjects } from '../recommendations/useRecommendationSubjects';
import { RecommendationCard } from '../recommendations/RecommendationCard';
import { Room } from '../room';
import { ApprovalCard } from '../approval-card';
import { Button } from '../Button/Button';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { EmptyState } from '../EmptyState/EmptyState';
import { domainErrorCopy } from '../domain-error-copy';
import { PlanCard, planItemKey } from './PlanCard';
import styles from './PlanningTable.module.css';

/**
 * The Planning Table room — the member's standing coordinated plan, plus
 * anything else still waiting on a decision, in one place. Genuinely new
 * UI (no `/plans` route existed before), but 100% composition over
 * existing state: `PlanContext.buildPlan()` is the exact same action the
 * arrival flow's `CoordinatedPlanStep` already calls, and every card here
 * is the same `PlanCard`/`RecommendationCard` reused verbatim — no new
 * approval mechanism, no new backend call. Built with no `needId`
 * (there is no specific conversation to ground it in here, unlike the
 * arrival flow or the standing Conversation Room), so this plan is
 * assembled from the AI Recommendation categories alone — a CITY_RESOURCE
 * item, which requires a needId to ever match, cannot appear here.
 */
export function PlanningTable() {
  const { session } = useSession();
  const plan = usePlan();
  const recommendations = useRecommendations();

  useEffect(() => {
    if (!session.isAuthenticated) return;
    if (!plan.state.plan && !plan.state.isBuilding) void plan.buildPlan();
    void recommendations.loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAuthenticated]);

  const planRecommendationIds = new Set(
    plan.state.plan
      ? [plan.state.plan.primary, ...plan.state.plan.supporting]
          .filter((item) => item.source === 'RECOMMENDATION')
          .map((item) => item.recommendation!.id)
      : [],
  );
  const planRecommendations = plan.state.plan
    ? [plan.state.plan.primary, ...plan.state.plan.supporting]
        .filter((item) => item.source === 'RECOMMENDATION')
        .map((item) => item.recommendation!)
    : [];
  const planSubjectsById = useRecommendationSubjects(planRecommendations);

  const otherPending = recommendations.state.recommendations.filter(
    (r) => r.status === 'PENDING' && !planRecommendationIds.has(r.id),
  );
  const otherSubjectsById = useRecommendationSubjects(otherPending);

  if (!session.isAuthenticated) {
    return (
      <Room title="Planning Table">
        <EmptyState
          title="Sign in to see your plan"
          description="Sign in to see what Aureus has coordinated for you, and anything else waiting on your decision."
        />
      </Room>
    );
  }

  return (
    <Room title="Planning Table" description="One coordinated plan, and anything else still waiting on your decision.">
      {plan.state.isBuilding ? <LoadingState label="Coordinating your plan" /> : null}

      {plan.state.error ? (
        <ErrorState
          title={domainErrorCopy(plan.state.error.kind).title}
          description={domainErrorCopy(plan.state.error.kind).description}
          action={
            plan.state.error.retryable ? (
              <Button variant="secondary" onClick={() => void plan.buildPlan()}>
                Try again
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {!plan.state.isBuilding && !plan.state.error && plan.state.plan ? (
        <div className={styles.planSection}>
          <p className={styles.rationale}>{plan.state.plan.combinedRationale}</p>
          {[plan.state.plan.primary, ...plan.state.plan.supporting].map((item, index) => {
            const card = (
              <PlanCard
                item={item}
                role={index === 0 ? 'Primary' : 'Supporting'}
                subject={item.source === 'RECOMMENDATION' ? (planSubjectsById[item.recommendation!.id] ?? null) : null}
                offerResponse={null}
                deciding={item.source === 'RECOMMENDATION' ? recommendations.isDeciding(item.recommendation!.id) : false}
                onApprove={() => {
                  if (item.source === 'RECOMMENDATION') void recommendations.approve(item.recommendation!.id);
                }}
                onDismiss={() => {
                  if (item.source === 'RECOMMENDATION') void recommendations.dismiss(item.recommendation!.id);
                }}
              />
            );
            return item.source === 'RECOMMENDATION' ? (
              <ApprovalCard key={planItemKey(item)}>{card}</ApprovalCard>
            ) : (
              <div key={planItemKey(item)}>{card}</div>
            );
          })}
        </div>
      ) : null}

      {!plan.state.isBuilding && !plan.state.plan && !plan.state.error ? (
        <EmptyState
          title="Nothing to coordinate yet"
          description="Ask your steward in conversation any time — a coordinated plan will appear here once there's something real to suggest."
        />
      ) : null}

      {otherPending.length > 0 ? (
        <div className={styles.otherSection}>
          <h2 className={styles.otherTitle}>Also waiting on you</h2>
          {otherPending.map((rec) => (
            <ApprovalCard key={rec.id}>
              <RecommendationCard
                rationale={rec.rationale}
                subject={otherSubjectsById[rec.id] ?? null}
                deciding={recommendations.isDeciding(rec.id)}
                onApprove={() => void recommendations.approve(rec.id)}
                onDismiss={() => void recommendations.dismiss(rec.id)}
              />
            </ApprovalCard>
          ))}
        </div>
      ) : null}
    </Room>
  );
}
