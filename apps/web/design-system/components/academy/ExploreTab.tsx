'use client';

import { useEffect, useState } from 'react';
import { useAcademy } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { Button } from '../Button/Button';
import { VisuallyHidden } from '../../accessibility';
import { CourseCard } from './CourseCard';
import { CourseDetail } from './CourseDetail';
import { AcademyFilters, type AcademyFiltersValue } from './AcademyFilters';
import { domainErrorCopy } from '../domain-error-copy';
import styles from './ExploreTab.module.css';

export interface ExploreTabProps {
  selectedCourseId: string | null;
  onSelectCourse: (courseId: string | null) => void;
}

/**
 * Explore — browse, search, and filter verified courses by learning
 * area (the backend's `learningDomain`, already supporting search via
 * `ListCoursesQueryDto.q`, so nothing new was needed on the backend).
 */
export function ExploreTab({ selectedCourseId, onSelectCourse }: ExploreTabProps) {
  const academy = useAcademy();
  const [filters, setFilters] = useState<AcademyFiltersValue>({});

  useEffect(() => {
    void academy.searchCourses({});
    void academy.loadMyEnrollments();
    void academy.loadLearningPaths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academy.searchCourses, academy.loadMyEnrollments, academy.loadLearningPaths]);

  useEffect(() => {
    for (const path of academy.state.learningPaths) {
      if (!academy.state.pathCoursesByPathId[path.id]) void academy.loadPathCourses(path.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academy.state.learningPaths]);

  function runSearch(next: AcademyFiltersValue) {
    setFilters(next);
    void academy.searchCourses({ q: next.q, learningDomain: next.learningDomain });
  }

  const canLoadMore = !!academy.state.catalogMeta && academy.state.catalogMeta.page < academy.state.catalogMeta.totalPages;

  if (selectedCourseId) {
    return <CourseDetail courseId={selectedCourseId} onBack={() => onSelectCourse(null)} />;
  }

  return (
    <div className={styles.tab}>
      <VisuallyHidden>
        <h2>Explore courses</h2>
      </VisuallyHidden>
      <AcademyFilters value={filters} onChange={runSearch} />

      {academy.state.isSearchingCatalog ? <LoadingState label="Searching courses" /> : null}

      {academy.state.error ? (
        <ErrorState
          title={domainErrorCopy(academy.state.error.kind).title}
          description={domainErrorCopy(academy.state.error.kind).description}
        />
      ) : null}

      {!academy.state.isSearchingCatalog && !academy.state.error && academy.state.catalogResults.length === 0 ? (
        <EmptyState
          title="No courses found"
          description="Try a different search, or check back soon — new courses are added regularly."
        />
      ) : null}

      {academy.state.catalogResults.length > 0 ? (
        <div className={styles.results}>
          {academy.state.catalogResults.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              enrolled={!!academy.state.enrollmentsByCourseId[course.id]}
              onOpen={() => onSelectCourse(course.id)}
            />
          ))}
        </div>
      ) : null}

      {canLoadMore ? (
        <Button variant="secondary" onClick={() => void academy.loadMoreCourses()} disabled={academy.state.isLoadingMoreCatalog}>
          {academy.state.isLoadingMoreCatalog ? 'Loading more…' : 'Load more'}
        </Button>
      ) : null}

      {academy.state.learningPaths.length > 0 ? (
        <div className={styles.pathsSection}>
          <h3 className={styles.pathsTitle}>Learning paths</h3>
          <ul className={styles.pathList}>
            {academy.state.learningPaths.map((path) => {
              const courses = (academy.state.pathCoursesByPathId[path.id] ?? [])
                .map((pc) => academy.state.coursesById[pc.courseId])
                .filter((c): c is NonNullable<typeof c> => !!c);
              return (
                <li key={path.id}>
                  <p>
                    <strong>{path.title}</strong> — {path.shortDescription}
                  </p>
                  {courses.length > 0 ? (
                    <ul>
                      {courses.map((course) => (
                        <li key={course.id}>
                          <button type="button" onClick={() => onSelectCourse(course.id)}>
                            {course.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
