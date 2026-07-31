'use client';

import { useEffect, useState } from 'react';
import { useOpportunities } from '../../../state';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { Button } from '../Button/Button';
import { VisuallyHidden } from '../../accessibility';
import {
  OpportunityCard,
  OpportunityDetail,
  OpportunityFilters,
  sortOptionToParams,
  type OpportunityFiltersValue,
} from '../opportunities';
import { domainErrorCopy } from '../domain-error-copy';
import styles from './SearchTab.module.css';

/**
 * Search — browse, filter, sort, and page through verified opportunities
 * (the DOMAIN-001 experience, carried forward unchanged apart from the
 * sort control and pagination this Domain adds).
 */
export function SearchTab() {
  const opportunities = useOpportunities();
  const [filters, setFilters] = useState<OpportunityFiltersValue>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void opportunities.search({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunities.search]);

  function runSearch(next: OpportunityFiltersValue) {
    setFilters(next);
    void opportunities.search({
      q: next.q,
      category: next.category as never,
      deadlineFilter: next.deadlineFilter,
      ...sortOptionToParams(next.sort),
    });
  }

  const selected = opportunities.state.results.find((o) => o.id === selectedId) ?? null;
  const canLoadMore = !!opportunities.state.meta && opportunities.state.meta.page < opportunities.state.meta.totalPages;

  return (
    <div className={styles.tab}>
      <VisuallyHidden>
        <h2>Search opportunities</h2>
      </VisuallyHidden>
      <OpportunityFilters value={filters} onChange={runSearch} />

      {selected ? (
        <div className={styles.detail}>
          <button type="button" className={styles.back} onClick={() => setSelectedId(null)}>
            ← Back to results
          </button>
          <OpportunityDetail
            opportunity={selected}
            saved={opportunities.isSaved(selected.id)}
            onToggleSave={() => void opportunities.toggleSave(selected.id)}
          />
        </div>
      ) : (
        <>
          {opportunities.state.isSearching ? <LoadingState label="Searching opportunities" /> : null}

          {opportunities.state.error ? (
            <ErrorState
              title={domainErrorCopy(opportunities.state.error.kind).title}
              description={domainErrorCopy(opportunities.state.error.kind).description}
            />
          ) : null}

          {!opportunities.state.isSearching && !opportunities.state.error && opportunities.state.results.length === 0 ? (
            <EmptyState
              title="No opportunities found"
              description="Try a different search, or check back soon — new opportunities are added regularly."
            />
          ) : null}

          {opportunities.state.results.length > 0 ? (
            <div className={styles.results}>
              {opportunities.state.results.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  saved={opportunities.isSaved(opportunity.id)}
                  onToggleSave={() => void opportunities.toggleSave(opportunity.id)}
                  onOpen={() => setSelectedId(opportunity.id)}
                />
              ))}
            </div>
          ) : null}

          {canLoadMore ? (
            <Button
              variant="secondary"
              onClick={() => void opportunities.loadMore()}
              disabled={opportunities.state.isLoadingMore}
            >
              {opportunities.state.isLoadingMore ? 'Loading more…' : 'Load more'}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
