'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOpportunities } from '../../../state';
import { OpportunityCard } from '../opportunities/OpportunityCard';
import styles from './OpportunityHighlights.module.css';

const HIGHLIGHT_LIMIT = 3;

/**
 * A small, confidence-ranked preview of Opportunity Discovery (AFX-001
 * §8) — not the full search surface, which remains `/opportunities`.
 */
export function OpportunityHighlights() {
  const router = useRouter();
  const { state, search, isSaved, toggleSave } = useOpportunities();

  useEffect(() => {
    void search({ limit: HIGHLIGHT_LIMIT, sortBy: 'confidence', sortOrder: 'desc' });
    // Opportunity discovery is public and `search` is stable across auth
    // hydration, so this runs once rather than fetching the same catalog
    // again when a member token appears.
  }, [search]);

  // Do not render an empty highlights shell while the public catalog request
  // is in flight or when it resolves empty. The home preview appears only once
  // there is something useful to show.
  if (state.results.length === 0) {
    return null;
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.title}>Opportunities for you</h2>
      <div className={styles.cards}>
        {state.results.slice(0, HIGHLIGHT_LIMIT).map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            saved={isSaved(opportunity.id)}
            onToggleSave={() => void toggleSave(opportunity.id)}
            onOpen={() => router.push('/opportunities')}
          />
        ))}
      </div>
    </div>
  );
}
