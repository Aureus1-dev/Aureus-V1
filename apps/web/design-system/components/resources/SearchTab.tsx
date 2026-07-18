'use client';

import { useEffect, useState } from 'react';
import { useResources } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { Button } from '../Button/Button';
import { VisuallyHidden } from '../../accessibility';
import { domainErrorCopy } from '../domain-error-copy';
import { ResourceCard } from './ResourceCard';
import { ResourceFilters, type ResourceFiltersValue } from './ResourceFilters';
import styles from './SearchTab.module.css';

/** Search — browse, filter, and page through verified resources, mirroring Opportunity Center's SearchTab (PR-002). */
export function SearchTab() {
  const resources = useResources();
  const [filters, setFilters] = useState<ResourceFiltersValue>({});

  useEffect(() => {
    void resources.search({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resources.search]);

  function runSearch(next: ResourceFiltersValue) {
    setFilters(next);
    void resources.search({ q: next.q, category: next.category as never, isRemote: next.isRemote });
  }

  const canLoadMore = !!resources.state.meta && resources.state.meta.page < resources.state.meta.totalPages;

  return (
    <div className={styles.tab}>
      <VisuallyHidden>
        <h2>Search resources</h2>
      </VisuallyHidden>
      <ResourceFilters value={filters} onChange={runSearch} />

      {resources.state.isSearching ? <LoadingState label="Searching resources" /> : null}

      {resources.state.error ? (
        <ErrorState
          title={domainErrorCopy(resources.state.error.kind).title}
          description={domainErrorCopy(resources.state.error.kind).description}
        />
      ) : null}

      {!resources.state.isSearching && !resources.state.error && resources.state.results.length === 0 ? (
        <EmptyState title="No resources found" description="Try a different search, or check back soon." />
      ) : null}

      {resources.state.results.length > 0 ? (
        <div className={styles.results}>
          {resources.state.results.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              saved={resources.isSaved(resource.id)}
              onToggleSave={() => void resources.toggleSave(resource.id)}
              onOpen={() => window.open(resource.officialSourceUrl, '_blank', 'noreferrer noopener')}
            />
          ))}
        </div>
      ) : null}

      {canLoadMore ? (
        <Button variant="secondary" onClick={() => void resources.loadMore()} disabled={resources.state.isLoadingMore}>
          {resources.state.isLoadingMore ? 'Loading more…' : 'Load more'}
        </Button>
      ) : null}
    </div>
  );
}
