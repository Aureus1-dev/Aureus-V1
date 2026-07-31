'use client';

import { useState } from 'react';
import { useSession } from '../../../state';
import { EmptyState } from '../EmptyState/EmptyState';
import { OpportunityTabs, type OpportunityTab } from './OpportunityTabs';
import { SearchTab } from './SearchTab';
import { SavedTab } from './SavedTab';
import { RecommendedTab } from './RecommendedTab';
import styles from './OpportunityCenter.module.css';

type TabId = 'search' | 'saved' | 'recommended';

const TABS: OpportunityTab[] = [
  { id: 'search', label: 'Search' },
  { id: 'saved', label: 'Saved' },
  { id: 'recommended', label: 'Recommended' },
];

/**
 * Opportunity Center — one standing surface, three views over the same
 * domain (Founder Decision, DOMAIN-004: Search / Saved / Recommended,
 * not three separate routes). All three panels stay mounted and are
 * shown/hidden rather than mounted/unmounted on tab switch, so a
 * member's in-progress search or an already-loaded Saved list survives
 * moving between tabs, and each tab's own data loads exactly once.
 */
export function OpportunityCenter() {
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>('search');

  if (!session.isAuthenticated) {
    return (
      <EmptyState
        title="Sign in to see the Opportunity Center"
        description="Sign in to search, save, and get personalized opportunity recommendations."
      />
    );
  }

  return (
    <div className={styles.center}>
      <h1 className={styles.title}>Opportunities</h1>
      <OpportunityTabs tabs={TABS} activeId={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

      <div
        role="tabpanel"
        id="opportunity-panel-search"
        aria-labelledby="opportunity-tab-search"
        hidden={activeTab !== 'search'}
      >
        <SearchTab />
      </div>
      <div
        role="tabpanel"
        id="opportunity-panel-saved"
        aria-labelledby="opportunity-tab-saved"
        hidden={activeTab !== 'saved'}
      >
        <SavedTab />
      </div>
      <div
        role="tabpanel"
        id="opportunity-panel-recommended"
        aria-labelledby="opportunity-tab-recommended"
        hidden={activeTab !== 'recommended'}
      >
        <RecommendedTab />
      </div>
    </div>
  );
}
