'use client';

import { useState } from 'react';
import { useSession } from '../../../state';
import { EmptyState } from '../EmptyState/EmptyState';
import { AcademyTabs, type AcademyTab } from './AcademyTabs';
import { GrowTab } from './GrowTab';
import { ExploreTab } from './ExploreTab';
import { MyLearningTab } from './MyLearningTab';
import styles from './AcademyCenter.module.css';

type TabId = 'grow' | 'explore' | 'my-learning';

const TABS: AcademyTab[] = [
  { id: 'grow', label: 'Grow' },
  { id: 'explore', label: 'Explore' },
  { id: 'my-learning', label: 'My Learning' },
];

/**
 * Stewardship Academy — one standing surface, three views (DOMAIN-006,
 * mirroring the Opportunity Center's proven pattern: Grow / Explore / My
 * Learning, not three separate routes). All three panels stay mounted
 * and are shown/hidden rather than mounted/unmounted on tab switch, so
 * an in-progress search or an already-loaded course survives moving
 * between tabs. `selectedCourseId` is lifted here so "Continue learning"
 * on the Grow tab can jump straight into a course on the Explore tab.
 */
export function AcademyCenter() {
  const { session } = useSession();
  const [activeTab, setActiveTab] = useState<TabId>('grow');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  if (!session.isAuthenticated) {
    return (
      <EmptyState
        title="Sign in to visit the Academy"
        description="Sign in for guided learning grounded in your own goals."
      />
    );
  }

  function openCourse(courseId: string) {
    setSelectedCourseId(courseId);
    setActiveTab('explore');
  }

  return (
    <div className={styles.center}>
      <h1 className={styles.title}>Academy</h1>
      <AcademyTabs tabs={TABS} activeId={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

      <div role="tabpanel" id="academy-panel-grow" aria-labelledby="academy-tab-grow" hidden={activeTab !== 'grow'}>
        <GrowTab onSelectCourse={openCourse} />
      </div>
      <div role="tabpanel" id="academy-panel-explore" aria-labelledby="academy-tab-explore" hidden={activeTab !== 'explore'}>
        <ExploreTab selectedCourseId={selectedCourseId} onSelectCourse={setSelectedCourseId} />
      </div>
      <div
        role="tabpanel"
        id="academy-panel-my-learning"
        aria-labelledby="academy-tab-my-learning"
        hidden={activeTab !== 'my-learning'}
      >
        <MyLearningTab onSelectCourse={openCourse} />
      </div>
    </div>
  );
}
