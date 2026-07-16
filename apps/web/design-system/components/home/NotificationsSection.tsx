'use client';

import { useEffect } from 'react';
import { useNotifications } from '../../../state';
import { NotificationsPreview } from './NotificationsPreview';
import { RecentActivity } from './RecentActivity';
import styles from './NotificationsSection.module.css';

const FETCH_LIMIT = 10;

/**
 * One fetch, two views (FPB-010 §7 "minimal duplication"): Notifications
 * preview (unread only) and Recent Activity (chronological, read or
 * not) both derive from the same loaded batch rather than issuing
 * competing requests into the same context list.
 */
export function NotificationsSection() {
  const { state, load, loadUnreadCount, markRead } = useNotifications();

  useEffect(() => {
    void load({ limit: FETCH_LIMIT });
    void loadUnreadCount();
    // `load`/`loadUnreadCount` are recreated (via useCallback) whenever the
    // session access token changes, so depending on them here re-fires the
    // fetch once a token becomes available after mount rather than
    // silently no-oping forever.
  }, [load, loadUnreadCount]);

  const unread = state.notifications.filter((n) => !n.readAt);

  return (
    <div className={styles.section}>
      <NotificationsPreview unread={unread} unreadCount={state.unreadCount} onMarkRead={(id) => void markRead(id)} />
      <RecentActivity activity={state.notifications} />
    </div>
  );
}
