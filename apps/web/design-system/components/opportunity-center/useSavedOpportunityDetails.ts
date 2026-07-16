'use client';

import { useEffect, useMemo, useState } from 'react';
import { getOpportunity, type OpportunityDto } from '../../../lib/api/opportunities';
import type { SavedOpportunityDto } from '../../../lib/api/saved-opportunities';
import { useSession } from '../../../state/session/SessionContext';

export interface SavedOpportunityDetails {
  detailsById: Record<string, OpportunityDto>;
  isLoading: boolean;
}

/**
 * Saved Opportunities only carry an `opportunityId` (the Saved record
 * itself is member-tracking data, not a copy of the listing) — this
 * resolves each saved item's full Opportunity so the Saved tab can show
 * a title, provider, and deadline rather than a bare id.
 */
export function useSavedOpportunityDetails(saved: SavedOpportunityDto[]): SavedOpportunityDetails {
  const { session } = useSession();
  const [detailsById, setDetailsById] = useState<Record<string, OpportunityDto>>({});
  const [isLoading, setIsLoading] = useState(false);

  const ids = useMemo(() => Array.from(new Set(saved.map((s) => s.opportunityId))), [saved]);
  const idsKey = ids.join(',');

  useEffect(() => {
    if (!session.accessToken || ids.length === 0) return;
    let cancelled = false;
    setIsLoading(true);
    void Promise.all(ids.map((id) => getOpportunity(session.accessToken!, id)))
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, OpportunityDto> = {};
        for (const opportunity of results) next[opportunity.id] = opportunity;
        setDetailsById(next);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, session.accessToken]);

  return { detailsById, isLoading };
}
