import { Card } from '../Card/Card';
import type { GrowthSummary } from '../../../state';
import { formatLearningDomain } from './academy-format';
import styles from './GrowthSummaryCard.module.css';

export interface GrowthSummaryCardProps {
  summary: GrowthSummary;
}

/**
 * Growth, not consumption (Founder Decision 3 — "The Academy shouldn't
 * just track completion. It should track growth."). Deliberately shows
 * several small, human-scaled facts about a member's own development
 * rather than one dominant "% complete" progress bar, so the emphasis
 * stays on becoming rather than finishing.
 */
export function GrowthSummaryCard({ summary }: GrowthSummaryCardProps) {
  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Your growth</h2>
      <div className={styles.grid}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{summary.lessonsCompleted}</span>
          <span className={styles.statLabel}>Lessons completed</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{summary.areasExplored.length}</span>
          <span className={styles.statLabel}>Areas explored</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{summary.skillsPracticed}</span>
          <span className={styles.statLabel}>Skills practiced</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{summary.certificationsEarned}</span>
          <span className={styles.statLabel}>Certifications earned</span>
        </div>
      </div>
      {summary.areasExplored.length > 0 ? (
        <div className={styles.areas}>
          {summary.areasExplored.map((area) => (
            <span key={area} className={styles.areaChip}>
              {formatLearningDomain(area)}
            </span>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
