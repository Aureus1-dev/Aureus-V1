'use client';

import { useEffect } from 'react';
import type { OpportunityDto } from '../../../../lib/api/opportunities';
import type { OpportunityError } from '../../../../state';
import { Button } from '../../Button/Button';
import { LoadingState } from '../../LoadingState/LoadingState';
import { EmptyState } from '../../EmptyState/EmptyState';
import { ErrorState } from '../../ErrorState/ErrorState';
import { OpportunityCard } from '../../opportunities';
import { domainErrorCopy } from '../../domain-error-copy';
import styles from './OpportunityDiscoveryStep.module.css';

export interface OpportunityDiscoveryStepProps {
  searchHint: string;
  results: OpportunityDto[];
  searching: boolean;
  error: OpportunityError | null;
  onSearch: (q: string) => void;
  isSaved: (opportunityId: string) => boolean;
  onToggleSave: (opportunityId: string) => void;
  onOpenOpportunity: (opportunityId: string) => void;
  onContinue: () => void;
}

/**
 * Opportunity Discovery (AFX-001 §8) — surfaces relevant opportunities
 * as soon as the member's first mission is known, before asking them to
 * decide anything.
 */
export function OpportunityDiscoveryStep({
  searchHint,
  results,
  searching,
  error,
  onSearch,
  isSaved,
  onToggleSave,
  onOpenOpportunity,
  onContinue,
}: OpportunityDiscoveryStepProps) {
  useEffect(() => {
    onSearch(searchHint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchHint]);

  return (
    <div className={styles.step}>
      <h2 className={styles.title}>Opportunities that might help</h2>
      <p className={styles.body}>
        Here&apos;s what we found related to what you told us. Save anything that looks relevant — you can always
        browse more later.
      </p>

      {searching ? <LoadingState label="Looking for opportunities" /> : null}

      {error ? (
        <ErrorState
          title={domainErrorCopy(error.kind).title}
          description={domainErrorCopy(error.kind).description}
          action={
            error.retryable ? (
              <Button variant="secondary" onClick={() => onSearch(searchHint)}>
                Try again
              </Button>
            ) : undefined
          }
        />
      ) : null}

      {!searching && !error && results.length === 0 ? (
        <EmptyState
          title="Nothing matched yet"
          description="You can browse the full list of opportunities any time from the Opportunities surface."
        />
      ) : null}

      {!searching && results.length > 0 ? (
        <div className={styles.results}>
          {results.slice(0, 3).map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              saved={isSaved(opportunity.id)}
              onToggleSave={() => onToggleSave(opportunity.id)}
              onOpen={() => onOpenOpportunity(opportunity.id)}
            />
          ))}
        </div>
      ) : null}

      <Button onClick={onContinue}>Continue</Button>
    </div>
  );
}
