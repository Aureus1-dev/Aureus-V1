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
    // `search` is recreated (via useCallback) whenever the session access
    // token changes, so depending on it here — rather than an empty array —
    // re-fires this search once a token becomes available after mount
    // instead of silently no-oping forever (the same bug class fixed in
    // WelcomeFlow's loadGoals effect).
  }, [search]);

  if (!state.isSearching && state.results.length === 0) {
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
