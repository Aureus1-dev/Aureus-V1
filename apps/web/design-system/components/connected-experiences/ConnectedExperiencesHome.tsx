'use client';

import { useState } from 'react';
import { useSession } from '../../../state';
import { EmptyState } from '../EmptyState/EmptyState';
import { ConnectedExperiencesTabs, type ConnectedExperiencesTab } from './ConnectedExperiencesTabs';
import { ConnectedAccountsTab } from './ConnectedAccountsTab';
import { DocumentsTab } from './DocumentsTab';
import { ActivityTab } from './ActivityTab';
import styles from './ConnectedExperiencesHome.module.css';

type TabId = 'accounts' | 'documents' | 'activity';

const TABS: ConnectedExperiencesTab[] = [
  { id: 'accounts', label: 'Connected Accounts' },
  { id: 'documents', label: 'Documents' },
  { id: 'activity', label: 'Activity' },
];

export interface ConnectedExperiencesHomeProps {
  /** Defaults to the provider catalog; `/documents` opens directly onto the Documents tab (FPB-002 §3 — a distinct primary surface). */
  initialTab?: TabId;
}

/**
 * Connected Experiences (DOMAIN-008) — "feel like memory, not
 * surveillance." Three views: the provider catalog (opt-in, revocable,
 * honest about what's actually live), Documents (fully real, no third
 * party required), and the Steward activity audit trail that backs a
 * future Trust Center.
 */
export function ConnectedExperiencesHome({ initialTab = 'accounts' }: ConnectedExperiencesHomeProps) {
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  if (!session.isAuthenticated) {
    return (
      <EmptyState
        title="Sign in to view your Connected Experiences"
        description="Sign in to manage connected accounts, documents, and your activity history."
      />
    );
  }

  return (
    <div className={styles.home}>
      <h1 className={styles.title}>Connected Experiences</h1>
      <p className={styles.subtitle}>
        Your Steward never assumes access. Every connection here is opt-in, revocable, and explained plainly.
      </p>
      <ConnectedExperiencesTabs tabs={TABS} activeId={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

      <div
        role="tabpanel"
        id="connected-experiences-panel-accounts"
        aria-labelledby="connected-experiences-tab-accounts"
        hidden={activeTab !== 'accounts'}
      >
        <ConnectedAccountsTab />
      </div>
      <div
        role="tabpanel"
        id="connected-experiences-panel-documents"
        aria-labelledby="connected-experiences-tab-documents"
        hidden={activeTab !== 'documents'}
      >
        <DocumentsTab />
      </div>
      <div
        role="tabpanel"
        id="connected-experiences-panel-activity"
        aria-labelledby="connected-experiences-tab-activity"
        hidden={activeTab !== 'activity'}
      >
        <ActivityTab />
      </div>
    </div>
  );
}
