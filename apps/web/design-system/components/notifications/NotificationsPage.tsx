'use client';

import { useEffect, useState } from 'react';
import { useNotifications, useSession } from '../../../state';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { VisuallyHidden } from '../../accessibility';
import { domainErrorCopy } from '../domain-error-copy';
import styles from './NotificationsPage.module.css';

type Filter = 'all' | 'unread';

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCategory(category: string): string {
  return category
    .toLowerCase()
    .split('_')
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/\bAi\b/, 'AI');
}

/**
 * The standing Notifications surface (PR-002) — the full list/read/read-all
 * contract the Home preview (DOMAIN-003) only ever showed a slice of.
 * `limit` grows rather than paginating into pages, matching the "Load
 * more" convention used elsewhere (e.g. Opportunity Center's SearchTab)
 * without needing to teach the context an append-based reducer.
 */
export function NotificationsPage() {
  const { session } = useSession();
  const { state, load, loadUnreadCount, markRead, markAllRead } = useNotifications();
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    void load({ limit, unreadOnly: filter === 'unread' });
    void loadUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, loadUnreadCount, filter, limit]);

  if (!session.isAuthenticated) {
    return <EmptyState title="Sign in to view your notifications" description="Sign in to see updates about your account, Journey, and Pods." />;
  }

  const hasMore = state.total !== null && state.notifications.length < state.total;
  const errorCopy = state.error ? domainErrorCopy(state.error.kind) : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Notifications</h1>
        <Button
          variant="secondary"
          onClick={() => void markAllRead()}
          disabled={!state.unreadCount}
        >
          Mark all as read
        </Button>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Filter notifications">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={filter === 'all' ? styles.tabActive : styles.tab}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'unread'}
          className={filter === 'unread' ? styles.tabActive : styles.tab}
          onClick={() => setFilter('unread')}
        >
          Unread{state.unreadCount ? ` (${state.unreadCount})` : ''}
        </button>
      </div>

      {state.isLoading && state.notifications.length === 0 ? <LoadingState label="Loading notifications" /> : null}

      {errorCopy && state.notifications.length === 0 && !state.isLoading ? (
        <ErrorState title={errorCopy.title} description={errorCopy.description} />
      ) : null}

      {!state.isLoading && !state.error && state.notifications.length === 0 ? (
        <EmptyState
          title={filter === 'unread' ? "You're all caught up" : 'No notifications yet'}
          description={filter === 'unread' ? 'You have no unread notifications right now.' : "We'll let you know when there's something new."}
        />
      ) : null}

      {state.notifications.length > 0 ? (
        <ul className={styles.list}>
          {state.notifications.map((notification) => (
            <li key={notification.id}>
              <Card className={notification.readAt ? styles.item : styles.itemUnread}>
                <div className={styles.itemHeader}>
                  <span className={styles.category}>{formatCategory(notification.category)}</span>
                  <span className={styles.date}>{formatDate(notification.createdAt)}</span>
                </div>
                <p className={styles.itemTitle}>{notification.title}</p>
                <p className={styles.itemBody}>{notification.body}</p>
                {!notification.readAt ? (
                  <Button variant="secondary" onClick={() => void markRead(notification.id)}>
                    Mark read
                    <VisuallyHidden>{` "${notification.title}"`}</VisuallyHidden>
                  </Button>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      {hasMore ? (
        <Button variant="secondary" onClick={() => setLimit((current) => current + PAGE_SIZE)} disabled={state.isLoading}>
          {state.isLoading ? 'Loading more…' : 'Load more'}
        </Button>
      ) : null}
    </div>
  );
}
