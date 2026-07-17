'use client';

import { useEffect } from 'react';
import { useRecommendations } from '../../../state';
import { RecommendationCard, useRecommendationSubjects } from '../recommendations';
import { LoadingState } from '../LoadingState/LoadingState';
import { STEWARD_STATUS } from './steward-status-copy';
import styles from './NeedsYourDecision.module.css';

/**
 * "Needs your decision" — the Steward Workspace's unified approvals
 * surface (DOMAIN-007 Founder Decision 3). Aggregates every pending AI
 * Recommendation regardless of category (Opportunity, Course, and — once
 * a future Domain wires subject resolution for them — Resource, Pod)
 * using the existing `RecommendationsContext`/`RecommendationCard`/
 * `useRecommendationSubjects` exactly as built, so no new backend
 * approval entity is introduced here. The Steward may present and
 * explain a pending decision; only the member's own click approves or
 * dismisses it — this component never does so on its own.
 */
export function NeedsYourDecision() {
  const recommendations = useRecommendations();

  useEffect(() => {
    void recommendations.loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations.loadMine]);

  const pending = recommendations.state.recommendations.filter((r) => r.status === 'PENDING');
  const subjectsById = useRecommendationSubjects(pending);

  return (
    <div className={styles.section}>
      <p className={styles.status}>{STEWARD_STATUS.waitingForDecision}</p>

      {recommendations.state.isLoading ? <LoadingState label="Checking for pending decisions" /> : null}

      {!recommendations.state.isLoading && pending.length === 0 ? (
        <p className={styles.empty}>Nothing needs your decision right now.</p>
      ) : null}

      {pending.length > 0 ? (
        <div className={styles.list}>
          {pending.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              rationale={recommendation.rationale}
              subject={subjectsById[recommendation.id] ?? null}
              deciding={recommendations.isDeciding(recommendation.id)}
              onApprove={() => void recommendations.approve(recommendation.id)}
              onDismiss={() => void recommendations.dismiss(recommendation.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
