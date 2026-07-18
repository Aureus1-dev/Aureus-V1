'use client';

import { useState } from 'react';
import { useSession } from '../../../state';
import { EmptyState } from '../EmptyState/EmptyState';
import { DiscoverTab } from './DiscoverTab';
import { MyPodsTab } from './MyPodsTab';
import styles from './PodsPage.module.css';

type TabId = 'discover' | 'mine';

/**
 * The standing Pods surface (PR-002) — Pods was previously a placeholder
 * with zero frontend despite being the largest backend domain. Two
 * views: Discover (browse/search, request to join, propose a new Pod)
 * and My Pods (memberships, invitations, and request status).
 */
export function PodsPage() {
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>('discover');

  if (!session.isAuthenticated) {
    return <EmptyState title="Sign in to view Pods" description="Sign in to discover Pods and see your memberships." />;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Pods</h1>

      <div className={styles.tabs} role="tablist" aria-label="Pods views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'discover'}
          className={activeTab === 'discover' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('discover')}
        >
          Discover
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'mine'}
          className={activeTab === 'mine' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('mine')}
        >
          My Pods
        </button>
      </div>

      {activeTab === 'discover' ? <DiscoverTab /> : <MyPodsTab />}
    </div>
  );
}
