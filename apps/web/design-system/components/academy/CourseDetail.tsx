'use client';

import { useEffect, useState } from 'react';
import { useAcademy } from '../../../state';
import { Button } from '../Button/Button';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { VisuallyHidden } from '../../accessibility';
import { LessonReader } from './LessonReader';
import { formatLearningDomain, formatDuration } from './academy-format';
import { domainErrorCopy } from '../domain-error-copy';
import styles from './CourseDetail.module.css';

export interface CourseDetailProps {
  courseId: string;
  onBack: () => void;
}

/**
 * A course's outline plus the AI Steward's own voice on why it matters
 * (`POST /ai/academy/courses/:id/guidance` — built for WO-029, unwired
 * until this Domain). Enrolling, reading a lesson, and reflecting all
 * happen here without leaving the page.
 */
export function CourseDetail({ courseId, onBack }: CourseDetailProps) {
  const academy = useAcademy();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const course = academy.state.coursesById[courseId] ?? null;
  const modules = academy.state.modulesByCourseId[courseId] ?? [];
  const enrollment = academy.state.enrollmentsByCourseId[courseId] ?? null;
  const progress = enrollment ? academy.state.progressByEnrollmentId[enrollment.id] ?? [] : [];
  const guidance = academy.state.guidanceByCourseId[courseId] ?? null;
  const isLoadingGuidance = academy.state.loadingGuidanceForCourseId === courseId;

  useEffect(() => {
    void academy.loadCourseDetail(courseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (enrollment) void academy.loadProgress(enrollment.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollment?.id]);

  if (academy.state.isLoadingCourseDetail && !course) {
    return <LoadingState label="Loading course" />;
  }

  if (academy.state.error && !course) {
    return (
      <ErrorState
        title={domainErrorCopy(academy.state.error.kind).title}
        description={domainErrorCopy(academy.state.error.kind).description}
      />
    );
  }

  if (!course) return null;

  const selectedLesson = selectedLessonId
    ? Object.values(academy.state.lessonsByModuleId)
        .flat()
        .find((l) => l.id === selectedLessonId) ?? null
    : null;
  const selectedLessonProgress = selectedLesson ? progress.find((p) => p.lessonId === selectedLesson.id) ?? null : null;

  if (selectedLesson) {
    return (
      <div className={styles.detail}>
        <button type="button" className={styles.back} onClick={() => setSelectedLessonId(null)}>
          ← Back to {course.title}
        </button>
        <LessonReader
          lesson={selectedLesson}
          progress={selectedLessonProgress}
          canTrack={!!enrollment}
          isUpdating={academy.state.isLoadingCourseDetail}
          onStart={() => enrollment && void academy.markLessonProgress(enrollment.id, selectedLesson.id, 'IN_PROGRESS')}
          onComplete={() => enrollment && void academy.markLessonProgress(enrollment.id, selectedLesson.id, 'COMPLETED')}
        />
      </div>
    );
  }

  const duration = formatDuration(course.estimatedDurationMinutes);

  return (
    <div className={styles.detail}>
      <button type="button" className={styles.back} onClick={onBack}>
        ← Back
      </button>

      <div className={styles.header}>
        <span className={styles.domain}>{formatLearningDomain(course.learningDomain)}</span>
        <h2 className={styles.title}>{course.title}</h2>
        <p className={styles.description}>{course.fullDescription}</p>
        <div className={styles.meta}>
          {duration ? <span>{duration}</span> : null}
          {course.grantsCertification ? <span>Includes certification</span> : null}
        </div>
        {enrollment ? (
          enrollment.status === 'COMPLETED' ? (
            <span>You&apos;ve completed this course.</span>
          ) : (
            <span>You&apos;re enrolled in this course.</span>
          )
        ) : (
          <Button onClick={() => void academy.enroll(courseId)}>Enroll</Button>
        )}
      </div>

      <div className={styles.guidance}>
        <p className={styles.guidanceLabel}>How does this fit your goals?</p>
        {guidance ? (
          <p className={styles.guidanceBody}>{guidance}</p>
        ) : (
          <Button
            variant="secondary"
            onClick={() => void academy.loadCourseGuidance(courseId)}
            disabled={isLoadingGuidance}
          >
            {isLoadingGuidance ? 'Asking your Steward…' : 'Ask your Steward'}
          </Button>
        )}
      </div>

      <div className={styles.outline}>
        <VisuallyHidden>
          <h3>Course outline</h3>
        </VisuallyHidden>
        {modules.map((module) => (
          <div key={module.id} className={styles.module}>
            <h3 className={styles.moduleTitle}>{module.title}</h3>
            <ul className={styles.lessonList}>
              {(academy.state.lessonsByModuleId[module.id] ?? []).map((lesson) => {
                const lessonProgress = progress.find((p) => p.lessonId === lesson.id);
                return (
                  <li key={lesson.id} className={styles.lessonItem}>
                    <button type="button" onClick={() => setSelectedLessonId(lesson.id)}>
                      <span>{lesson.title}</span>
                      <span className={styles.lessonStatus}>
                        {lessonProgress?.status === 'COMPLETED'
                          ? 'Completed'
                          : lessonProgress?.status === 'IN_PROGRESS'
                            ? 'In progress'
                            : ''}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
