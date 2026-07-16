'use client';

import { useEffect, useRef } from 'react';
import type { LessonDto, LessonProgressDto } from '../../../lib/api/academy';
import { Button } from '../Button/Button';
import { useRegisterHighlightTarget } from '../../../state';
import { reflectionPromptFor } from './reflection-prompts';
import styles from './LessonReader.module.css';
import highlightStyles from '../highlight/highlight.module.css';

export interface LessonReaderProps {
  lesson: LessonDto;
  progress: LessonProgressDto | null;
  canTrack: boolean;
  isUpdating: boolean;
  onStart: () => void;
  onComplete: () => void;
}

/**
 * The reading experience (Founder Domain Purpose — "help every member
 * become wiser... guided learning that directly improves their life").
 * Text-first, calm, unhurried: no progress-bar pressure, no scored quiz —
 * a reflection prompt instead (Founder Decision 2). Registered as the
 * fixed `Academy.Lesson.Current` highlight target (Founder Decision 4
 * example) so the voice steward can highlight the lesson it's teaching.
 */
export function LessonReader({ lesson, progress, canTrack, isUpdating, onStart, onComplete }: LessonReaderProps) {
  const { ref, isActive } = useRegisterHighlightTarget<HTMLDivElement>('Academy.Lesson.Current', {
    label: lesson.title,
  });
  const hasRequestedStart = useRef(false);

  useEffect(() => {
    hasRequestedStart.current = false;
  }, [lesson.id]);

  useEffect(() => {
    if (!canTrack || hasRequestedStart.current) return;
    if (progress && progress.status !== 'NOT_STARTED') return;
    hasRequestedStart.current = true;
    onStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canTrack, lesson.id, progress?.status]);

  const prompt = reflectionPromptFor(lesson.title, lesson.position);
  const isCompleted = progress?.status === 'COMPLETED';

  return (
    <div ref={ref} className={isActive ? highlightStyles.highlighted : undefined}>
      <div className={styles.reader}>
        <h2 className={styles.title}>{lesson.title}</h2>
        <p className={styles.content}>{lesson.content}</p>

        <div className={styles.reflection}>
          <p className={styles.reflectionHeading}>{prompt.heading}</p>
          <p className={styles.reflectionBody}>{prompt.body}</p>
        </div>

        {canTrack ? (
          <div className={styles.footer}>
            {isCompleted ? (
              <span className={styles.completedBadge}>You&apos;ve completed this lesson.</span>
            ) : (
              <Button onClick={onComplete} disabled={isUpdating}>
                {isUpdating ? 'Saving…' : "I've completed this lesson"}
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
