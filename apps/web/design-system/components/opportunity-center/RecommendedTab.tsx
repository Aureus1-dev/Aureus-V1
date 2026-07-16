'use client';

import { useEffect } from 'react';
import { useRecommendations } from '../../../state';
import { RecommendationCard, useRecommendationSubjects } from '../recommendations';
import { Button } from '../Button/Button';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { VisuallyHidden } from '../../accessibility';
import { domainErrorCopy } from '../domain-error-copy';
import styles from './RecommendedTab.module.css';

/**
 * Recommended — AI-prepared, explainable opportunity suggestions as a
 * standing capability, not a one-time onboarding artifact (DOMAIN-004;
 * AFX-001 §8 "transparent, explainable, grounded in evidence"). Loading
 * this tab only retrieves whatever already exists (`GET
 * /ai/recommendations`); generating new ones is always the member's own
 * explicit action (Founder Decision), so results are cached and reused
 * across visits rather than regenerated automatically.
 */
export function RecommendedTab() {
  const recommendations = useRecommendations();

  useEffect(() => {
    void recommendations.loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations.loadMine]);

  const opportunityRecommendations = recommendations.state.recommendations.filter((r) => r.opportunityId !== null);
  const pending = opportunityRecommendations.filter((r) => r.status === 'PENDING');
  const reviewed = opportunityRecommendations.filter((r) => r.status !== 'PENDING');
  const subjectsById = useRecommendationSubjects(opportunityRecommendations);
  const hasError = recommendations.state.error && pending.length === 0 && reviewed.length === 0;

  return (
    <div className={styles.tab}>
      <VisuallyHidden>
        <h2>Recommended opportunities</h2>
      </VisuallyHidden>
      <div className={styles.intro}>
        <p className={styles.body}>
          Aureus can prepare a few opportunity suggestions grounded in your own goals. Nothing happens until you approve
          one.
        </p>
        <Button onClick={() => void recommendations.generate('OPPORTUNITY')} disabled={recommendations.state.isGenerating}>
          {recommendations.state.isGenerating ? 'Preparing…' : 'Get Recommendations'}
        </Button>
      </div>

      {recommendations.state.isLoading ? <LoadingState label="Loading your recommendations" /> : null}

      {hasError ? (
        <ErrorState
          title={domainErrorCopy(recommendations.state.error!.kind).title}
          description={domainErrorCopy(recommendations.state.error!.kind).description}
        />
      ) : null}

      {!recommendations.state.isLoading &&
      !recommendations.state.isGenerating &&
      !hasError &&
      pending.length === 0 &&
      reviewed.length === 0 ? (
        <EmptyState
          title="No recommendations yet"
          description='Select "Get Recommendations" whenever you would like Aureus to suggest opportunities based on your goals.'
        />
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

      {reviewed.length > 0 ? (
        <div className={styles.reviewed}>
          <h3 className={styles.reviewedTitle}>Previously reviewed</h3>
          <ul className={styles.reviewedList}>
            {reviewed.map((recommendation) => (
              <li key={recommendation.id} className={styles.reviewedItem}>
                <span>{subjectsById[recommendation.id]?.title ?? 'Opportunity'}</span>
                <span className={styles.reviewedStatus}>
                  {recommendation.status === 'ACCEPTED' ? 'Approved' : 'Dismissed'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
