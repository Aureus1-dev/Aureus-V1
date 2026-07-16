'use client';

import { useEffect } from 'react';
import { useOpportunities } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { VisuallyHidden } from '../../accessibility';
import { domainErrorCopy } from '../domain-error-copy';
import { useSavedOpportunityDetails } from './useSavedOpportunityDetails';
import { SavedOpportunityRow } from './SavedOpportunityRow';
import styles from './SavedTab.module.css';

/**
 * Saved — a member's own tracking of opportunities they've saved:
 * status (Saved → Applying → Applied → Received, or Not interested),
 * a favorite flag, and a private note. The backend has supported this
 * since the Opportunity Engine's original build; this tab is the first
 * place it is actually surfaced to a member.
 */
export function SavedTab() {
  const opportunities = useOpportunities();

  useEffect(() => {
    void opportunities.loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunities.loadSaved]);

  const saved = Object.values(opportunities.state.savedByOpportunityId);
  const { detailsById, isLoading: isLoadingDetails } = useSavedOpportunityDetails(saved);

  const heading = (
    <VisuallyHidden>
      <h2>Saved opportunities</h2>
    </VisuallyHidden>
  );

  if (opportunities.state.isLoadingSaved) {
    return (
      <>
        {heading}
        <LoadingState label="Loading your saved opportunities" />
      </>
    );
  }

  // `error` is shared across every operation this context supports (search,
  // save, load, update); only treat it as blocking here when there is
  // nothing already loaded to show, since an unrelated Search-tab failure
  // should not hide a member's already-loaded Saved list.
  if (opportunities.state.error && saved.length === 0) {
    return (
      <>
        {heading}
        <ErrorState
          title={domainErrorCopy(opportunities.state.error.kind).title}
          description={domainErrorCopy(opportunities.state.error.kind).description}
        />
      </>
    );
  }

  if (saved.length === 0) {
    return (
      <>
        {heading}
        <EmptyState
          title="Nothing saved yet"
          description="Save an opportunity from Search to track it here — at your own pace, on your own terms."
        />
      </>
    );
  }

  return (
    <div className={styles.list}>
      {heading}
      {saved.map((record) => (
        <SavedOpportunityRow
          key={record.id}
          record={record}
          opportunity={detailsById[record.opportunityId] ?? null}
          isLoadingDetail={isLoadingDetails && !detailsById[record.opportunityId]}
          onUpdate={(update) => void opportunities.updateSaved(record.opportunityId, update)}
          onRemove={() => void opportunities.toggleSave(record.opportunityId)}
        />
      ))}
    </div>
  );
}
