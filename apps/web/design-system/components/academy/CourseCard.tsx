import type { CourseDto } from '../../../lib/api/academy';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { useRegisterHighlightTarget } from '../../../state';
import { formatLearningDomain, formatDuration } from './academy-format';
import styles from './CourseCard.module.css';
import highlightStyles from '../highlight/highlight.module.css';

export interface CourseCardProps {
  course: CourseDto;
  enrolled: boolean;
  onOpen: () => void;
}

/**
 * Course Card — deliberately not a "product tile": no price, no rating,
 * no artificial urgency (Founder Decision, Constitutional Design
 * Principles — "Learning shall never manipulate members through
 * addictive engagement mechanics"). Registered as `Academy.Course.<id>`
 * in the Global Highlight Registry (DOMAIN-005 Founder Decision 4) so
 * the voice steward can point one out while talking.
 */
export function CourseCard({ course, enrolled, onOpen }: CourseCardProps) {
  const { ref, isActive } = useRegisterHighlightTarget<HTMLDivElement>(`Academy.Course.${course.id}`, {
    label: course.title,
    description: course.shortDescription,
  });
  const duration = formatDuration(course.estimatedDurationMinutes);

  return (
    <div ref={ref} className={isActive ? highlightStyles.highlighted : undefined}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <span className={styles.domain}>{formatLearningDomain(course.learningDomain)}</span>
          {duration ? <span className={styles.duration}>{duration}</span> : null}
        </div>
        <h3 className={styles.title}>{course.title}</h3>
        <p className={styles.description}>{course.shortDescription}</p>
        <div className={styles.actions}>
          <Button onClick={onOpen}>{enrolled ? 'Continue' : 'Explore this course'}</Button>
        </div>
      </Card>
    </div>
  );
}
