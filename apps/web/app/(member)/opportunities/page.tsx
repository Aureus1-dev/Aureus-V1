'use client';

import { useEffect, useState } from 'react';
import { useOpportunities } from '../../../state';
import { LoadingState } from '../../../design-system/components/LoadingState/LoadingState';
import { EmptyState } from '../../../design-system/components/EmptyState/EmptyState';
import { ErrorState } from '../../../design-system/components/ErrorState/ErrorState';
import { OpportunityCard, OpportunityFilters, OpportunityDetail, type OpportunityFiltersValue } from '../../../design-system/components/opportunities';
import { domainErrorCopy } from '../../../design-system/components/domain-error-copy';
import styles from './page.module.css';

export default function OpportunitiesPage() {
  const opportunities = useOpportunities();
  const [filters, setFilters] = useState<OpportunityFiltersValue>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void opportunities.search({});
    void opportunities.loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFiltersChange(next: OpportunityFiltersValue) {
    setFilters(next);
    void opportunities.search({
      q: next.q,
      category: next.category as never,
      deadlineFilter: next.deadlineFilter,
    });
  }

  const selected = opportunities.state.results.find((o) => o.id === selectedId) ?? null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Opportunities</h1>
      <OpportunityFilters value={filters} onChange={handleFiltersChange} />

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
        </>
      )}
    </div>
  );
}
