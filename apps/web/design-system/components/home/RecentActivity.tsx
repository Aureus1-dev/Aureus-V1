import type { NotificationDto } from '../../../lib/api/notifications';
import { Card } from '../Card/Card';
import styles from './RecentActivity.module.css';

export interface RecentActivityProps {
  activity: NotificationDto[];
}

const RECENT_LIMIT = 5;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * A short chronological log across categories, read or not — distinct
 * from the Notifications preview above (DOMAIN-003 Founder Decision 2).
 * No per-item action; this is a record, not an inbox.
 */
export function RecentActivity({ activity }: RecentActivityProps) {
  if (activity.length === 0) {
    return null;
  }

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Recent activity</h2>
      <ul className={styles.list}>
        {activity.slice(0, RECENT_LIMIT).map((item) => (
          <li key={item.id} className={styles.item}>
            <span className={styles.itemTitle}>{item.title}</span>
            <span className={styles.itemDate}>{formatDate(item.createdAt)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
