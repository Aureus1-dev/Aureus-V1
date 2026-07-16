'use client';

import { useEffect } from 'react';
import { useAcademy, useRecommendations } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { Button } from '../Button/Button';
import { VisuallyHidden } from '../../accessibility';
import { RecommendationCard, useRecommendationSubjects } from '../recommendations';
import { GrowthSummaryCard } from './GrowthSummaryCard';
import { CourseCard } from './CourseCard';
import { domainErrorCopy } from '../domain-error-copy';
import styles from './GrowTab.module.css';

export interface GrowTabProps {
  onSelectCourse: (courseId: string) => void;
}

/**
 * "I want to grow" (Founder wording) — the Academy's front door. Framed
 * around becoming, not around a catalog to consume: growth summary,
 * courses already in progress, and AI-prepared learning recommendations
 * grounded in the member's own goals — the mentor sitting beside the
 * member, not a course browser.
 */
export function GrowTab({ onSelectCourse }: GrowTabProps) {
  const academy = useAcademy();
  const recommendations = useRecommendations();

  useEffect(() => {
    void academy.loadMyEnrollments();
    void academy.loadCertifications();
    void recommendations.loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academy.loadMyEnrollments, academy.loadCertifications, recommendations.loadMine]);

  const courseRecommendations = recommendations.state.recommendations.filter((r) => r.courseId !== null);
  const pending = courseRecommendations.filter((r) => r.status === 'PENDING');
  const reviewed = courseRecommendations.filter((r) => r.status !== 'PENDING');
  const subjectsById = useRecommendationSubjects(courseRecommendations);
  const { currentJourney } = academy.growthSummary;

  return (
    <div className={styles.tab}>
      <div className={styles.hero}>
        <h2 className={styles.heroTitle}>I want to grow</h2>
        <p className={styles.heroBody}>
          The Academy is here to help you become wiser, stronger, and more capable — guided learning that improves
          your life, not a course library to get through.
        </p>
      </div>

      <GrowthSummaryCard summary={academy.growthSummary} />

      {currentJourney.length > 0 ? (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Continue learning</h3>
          <div className={styles.list}>
            {currentJourney.map(({ enrollment, course }) =>
              course ? (
                <CourseCard key={enrollment.id} course={course} enrolled onOpen={() => onSelectCourse(course.id)} />
              ) : null,
            )}
          </div>
        </div>
      ) : null}

      <div className={styles.section}>
        <VisuallyHidden>
          <h3>Learning recommendations</h3>
        </VisuallyHidden>
        <h3 className={styles.sectionTitle}>Recommended for you</h3>
        <p>
          Your Steward can prepare a few learning suggestions grounded in your own goals. Nothing happens until you
          approve one.
        </p>
        <Button onClick={() => void recommendations.generate('COURSE')} disabled={recommendations.state.isGenerating}>
          {recommendations.state.isGenerating ? 'Preparing…' : 'Get Recommendations'}
        </Button>

        {recommendations.state.isLoading ? <LoadingState label="Loading your recommendations" /> : null}

        {recommendations.state.error && pending.length === 0 && reviewed.length === 0 ? (
          <ErrorState
            title={domainErrorCopy(recommendations.state.error.kind).title}
            description={domainErrorCopy(recommendations.state.error.kind).description}
          />
        ) : null}

        {!recommendations.state.isLoading && !recommendations.state.isGenerating && pending.length === 0 && reviewed.length === 0 ? (
          <EmptyState
            title="No recommendations yet"
            description='Select "Get Recommendations" whenever you would like your Steward to suggest a course based on your goals.'
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
          <ul className={styles.reviewedList}>
            {reviewed.map((recommendation) => (
              <li key={recommendation.id} className={styles.reviewedItem}>
                <span>{subjectsById[recommendation.id]?.title ?? 'Course'}</span>
                <span>{recommendation.status === 'ACCEPTED' ? 'Approved' : 'Dismissed'}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
