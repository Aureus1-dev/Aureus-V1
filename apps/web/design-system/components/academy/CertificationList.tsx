import type { CertificationDto, CourseDto } from '../../../lib/api/academy';
import { EmptyState } from '../EmptyState/EmptyState';
import styles from './CertificationList.module.css';

export interface CertificationListProps {
  certifications: CertificationDto[];
  coursesById: Record<string, CourseDto>;
}

export function CertificationList({ certifications, coursesById }: CertificationListProps) {
  if (certifications.length === 0) {
    return (
      <EmptyState
        title="No certifications yet"
        description="Complete a course that grants certification, and it will appear here."
      />
    );
  }

  return (
    <ul className={styles.list}>
      {certifications.map((certification) => (
        <li key={certification.id} className={styles.item}>
          <span className={styles.courseTitle}>
            {coursesById[certification.courseId]?.title ?? 'A completed course'}
          </span>
          <span className={styles.ref}>{certification.certificateRef ?? ''}</span>
        </li>
      ))}
    </ul>
  );
}
