'use client';

import { useEffect } from 'react';
import { useResources } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { VisuallyHidden } from '../../accessibility';
import { domainErrorCopy } from '../domain-error-copy';
import { useSavedResourceDetails } from './useSavedResourceDetails';
import { SavedResourceRow } from './SavedResourceRow';
import styles from './SavedTab.module.css';

/** Saved — a member's own tracking of saved resources, mirroring Opportunity Center's SavedTab (PR-002). */
export function SavedTab() {
  const resources = useResources();

  useEffect(() => {
    void resources.loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resources.loadSaved]);

  const saved = Object.values(resources.state.savedByResourceId);
  const { detailsById, isLoading: isLoadingDetails } = useSavedResourceDetails(saved);

  const heading = (
    <VisuallyHidden>
      <h2>Saved resources</h2>
    </VisuallyHidden>
  );

  if (resources.state.isLoadingSaved) {
    return (
      <>
        {heading}
        <LoadingState label="Loading your saved resources" />
      </>
    );
  }

  if (resources.state.error && saved.length === 0) {
    return (
      <>
        {heading}
        <ErrorState
          title={domainErrorCopy(resources.state.error.kind).title}
          description={domainErrorCopy(resources.state.error.kind).description}
        />
      </>
    );
  }

  if (saved.length === 0) {
    return (
      <>
        {heading}
        <EmptyState title="Nothing saved yet" description="Save a resource from Search to keep track of it here." />
      </>
    );
  }

  return (
    <div className={styles.list}>
      {heading}
      {saved.map((record) => (
        <SavedResourceRow
          key={record.id}
          record={record}
          resource={detailsById[record.resourceId] ?? null}
          isLoadingDetail={isLoadingDetails && !detailsById[record.resourceId]}
          onUpdate={(update) => void resources.updateSaved(record.resourceId, update)}
          onRemove={() => void resources.toggleSave(record.resourceId)}
        />
      ))}
    </div>
  );
}
