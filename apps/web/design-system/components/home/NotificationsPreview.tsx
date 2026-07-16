'use client';

import Link from 'next/link';
import type { NotificationDto } from '../../../lib/api/notifications';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { VisuallyHidden } from '../../accessibility';
import styles from './NotificationsPreview.module.css';

export interface NotificationsPreviewProps {
  unread: NotificationDto[];
  unreadCount: number | null;
  onMarkRead: (id: string) => void;
}

/**
 * Unread, actionable notifications only — distinct from Recent Activity
 * (DOMAIN-003 Founder Decision 2). No urgent-red badge or "you have
 * unread items!" framing (AFX-006 §9-10: outcomes, not engagement).
 */
export function NotificationsPreview({ unread, unreadCount, onMarkRead }: NotificationsPreviewProps) {
  if (!unreadCount) {
    return null;
  }

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Notifications</h2>
        <Link href="/notifications" className={styles.viewAll}>
          View all
        </Link>
      </div>
      <ul className={styles.list}>
        {unread.map((notification) => (
          <li key={notification.id} className={styles.item}>
            <div>
              <p className={styles.itemTitle}>{notification.title}</p>
              <p className={styles.itemBody}>{notification.body}</p>
            </div>
            <Button variant="secondary" onClick={() => onMarkRead(notification.id)}>
              Mark read
              <VisuallyHidden>{` "${notification.title}"`}</VisuallyHidden>
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
