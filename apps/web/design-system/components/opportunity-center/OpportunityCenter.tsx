'use client';

import { useEffect, useState } from 'react';
import { useSession } from '../../../state';
import { Room } from '../room';
import { OpportunityTabs, type OpportunityTab } from './OpportunityTabs';
import { SearchTab } from './SearchTab';
import { SavedTab } from './SavedTab';
import { RecommendedTab } from './RecommendedTab';
import { HarvestTab } from './HarvestTab';

type TabId = 'search' | 'saved' | 'recommended' | 'harvest';

const MEMBER_TABS: OpportunityTab[] = [
  { id: 'search', label: 'Search' },
  { id: 'saved', label: 'Saved' },
  { id: 'recommended', label: 'Recommended' },
];

const HARVEST_TAB: OpportunityTab = {
  id: 'harvest',
  label: 'Annual Harvest',
};

const GUEST_TABS: OpportunityTab[] = [{ id: 'search', label: 'Search' }];

/**
 * Opportunity Center — one standing surface over the same domain.
 * Search / Saved / Recommended remain the standing DOMAIN-004 views;
 * Annual Harvest is an explicit member-only execution surface. The three
 * core panels stay mounted and are
 * shown/hidden rather than mounted/unmounted on tab switch, so a
 * member's in-progress search or an already-loaded Saved list survives
 * moving between tabs, and each tab's own data loads exactly once.
 */
export function OpportunityCenter() {
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>('search');

  const canUseHarvest = session.isAuthenticated && !session.isGuest;

  useEffect(() => {
    if (!session.isAuthenticated && activeTab !== 'search') {
      setActiveTab('search');
      return;
    }
    if (activeTab === 'harvest' && !canUseHarvest) {
      setActiveTab('search');
    }
  }, [activeTab, canUseHarvest, session.isAuthenticated]);

  const tabs = session.isAuthenticated
    ? canUseHarvest
      ? [...MEMBER_TABS, HARVEST_TAB]
      : MEMBER_TABS
    : GUEST_TABS;

  return (
    <Room title="Opportunity Workspace">
      <OpportunityTabs tabs={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id as TabId)} />
      {!session.isAuthenticated ? (
        <p>
          You can search verified opportunities without an account. Sign in only if you want to save or receive
          personalized recommendations.
        </p>
      ) : null}

      <div
        role="tabpanel"
        id="opportunity-panel-search"
        aria-labelledby="opportunity-tab-search"
        hidden={activeTab !== 'search'}
      >
        <SearchTab />
      </div>
      {session.isAuthenticated ? (
        <>
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
          {canUseHarvest ? (
            <div
              role="tabpanel"
              id="opportunity-panel-harvest"
              aria-labelledby="opportunity-tab-harvest"
              hidden={activeTab !== 'harvest'}
            >
              {activeTab === 'harvest' ? <HarvestTab /> : null}
            </div>
          ) : null}
        </>
      ) : null}
    </Room>
  );
}
