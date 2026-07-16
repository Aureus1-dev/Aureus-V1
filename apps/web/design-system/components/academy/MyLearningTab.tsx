'use client';

import { useEffect } from 'react';
import { useAcademy } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { VisuallyHidden } from '../../accessibility';
import { GrowthSummaryCard } from './GrowthSummaryCard';
import { CertificationList } from './CertificationList';
import { CourseCard } from './CourseCard';
import styles from './MyLearningTab.module.css';

export interface MyLearningTabProps {
  onSelectCourse: (courseId: string) => void;
}

/**
 * My Learning — growth over consumption (Founder Decision 3). The
 * member's own current journey, what they've explored, and what
 * they've earned — never a bare percent-complete bar.
 */
export function MyLearningTab({ onSelectCourse }: MyLearningTabProps) {
  const academy = useAcademy();

  useEffect(() => {
    void academy.loadMyEnrollments();
    void academy.loadCertifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academy.loadMyEnrollments, academy.loadCertifications]);

  const isLoading = academy.state.isLoadingEnrollments || academy.state.isLoadingCertifications;
  const { currentJourney } = academy.growthSummary;

  return (
    <div className={styles.tab}>
      <VisuallyHidden>
        <h2>My learning</h2>
      </VisuallyHidden>

      <GrowthSummaryCard summary={academy.growthSummary} />

      {isLoading ? <LoadingState label="Loading your learning" /> : null}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Current journey</h3>
        {!isLoading && currentJourney.length === 0 ? (
          <EmptyState
            title="No courses in progress"
            description="Explore the Academy to start a course whenever you're ready."
          />
        ) : (
          currentJourney.map(({ enrollment, course }) =>
            course ? (
              <CourseCard key={enrollment.id} course={course} enrolled onOpen={() => onSelectCourse(course.id)} />
            ) : null,
          )
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Certifications</h3>
        <CertificationList certifications={academy.state.certifications} coursesById={academy.state.coursesById} />
      </div>
    </div>
  );
}
