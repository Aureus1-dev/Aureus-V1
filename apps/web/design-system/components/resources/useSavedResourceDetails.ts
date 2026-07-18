'use client';

import { useEffect, useMemo, useState } from 'react';
import { getResource, type ResourceDto } from '../../../lib/api/resources';
import type { SavedResourceDto } from '../../../lib/api/saved-resources';
import { useSession } from '../../../state/session/SessionContext';

export interface SavedResourceDetails {
  detailsById: Record<string, ResourceDto>;
  isLoading: boolean;
}

/**
 * Saved Resources only carry a `resourceId` — this resolves each saved
 * item's full Resource so the Saved tab can show a title and
 * organization rather than a bare id, mirroring
 * `useSavedOpportunityDetails` (PR-002).
 */
export function useSavedResourceDetails(saved: SavedResourceDto[]): SavedResourceDetails {
  const { session } = useSession();
  const [detailsById, setDetailsById] = useState<Record<string, ResourceDto>>({});
  const [isLoading, setIsLoading] = useState(false);

  const ids = useMemo(() => Array.from(new Set(saved.map((s) => s.resourceId))), [saved]);
  const idsKey = ids.join(',');

  useEffect(() => {
    if (!session.accessToken || ids.length === 0) return;
    let cancelled = false;
    setIsLoading(true);
    void Promise.all(ids.map((id) => getResource(session.accessToken!, id)))
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, ResourceDto> = {};
        for (const resource of results) next[resource.id] = resource;
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
