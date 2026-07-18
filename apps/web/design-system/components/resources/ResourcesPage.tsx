'use client';

import { useState } from 'react';
import { useSession } from '../../../state';
import { EmptyState } from '../EmptyState/EmptyState';
import { ResourceTabs, type ResourceTab } from './ResourceTabs';
import { SearchTab } from './SearchTab';
import { SavedTab } from './SavedTab';
import styles from './ResourcesPage.module.css';

type TabId = 'search' | 'saved';

const TABS: ResourceTab[] = [
  { id: 'search', label: 'Search' },
  { id: 'saved', label: 'Saved' },
];

/**
 * The standing Resources surface (PR-002) — Resources was previously a
 * placeholder despite the Resource Directory backend supporting the
 * same search/save shape as Opportunities (DOMAIN-004). Both panels
 * stay mounted (shown/hidden) so an in-progress search survives moving
 * between tabs, mirroring Opportunity Center.
 */
export function ResourcesPage() {
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>('search');

  if (!session.isAuthenticated) {
    return <EmptyState title="Sign in to browse Resources" description="Sign in to search and save resources." />;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Resources</h1>
      <ResourceTabs tabs={TABS} activeId={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

      <div role="tabpanel" id="resources-panel-search" aria-labelledby="resources-tab-search" hidden={activeTab !== 'search'}>
        <SearchTab />
      </div>
      <div role="tabpanel" id="resources-panel-saved" aria-labelledby="resources-tab-saved" hidden={activeTab !== 'saved'}>
        <SavedTab />
      </div>
    </div>
  );
}
