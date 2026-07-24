'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../../state';
import {
  getMatchingResources, getOffers, offerResource, respondToOffer,
  type MatchedResourceDto, type ResourceOfferDto,
} from '../../../lib/api/needs';
import { LoadingState } from '../LoadingState/LoadingState';
import { ErrorState } from '../ErrorState/ErrorState';
import { EmptyState } from '../EmptyState/EmptyState';
import { MatchedResourceCard } from './MatchedResourceCard';
import styles from './NeedResourcesPage.module.css';

export interface NeedResourcesPageProps {
  needId: string;
}

/**
 * Gate C (C5: Verified resource presentation). Whatever is shown here
 * visibly and unambiguously distinguishes verified, unverified, test, and
 * unavailable resources (the last one is this page's own empty state, not
 * silence). Every accept/decline is recorded via the backend's offer
 * endpoints and reflected back once the response settles.
 */
export function NeedResourcesPage({ needId }: NeedResourcesPageProps) {
  const { session } = useSession();
  const { accessToken } = session;
  const [resources, setResources] = useState<MatchedResourceDto[] | null>(null);
  const [offers, setOffers] = useState<ResourceOfferDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setError(null);
    try {
      const matched = await getMatchingResources(accessToken, needId);
      setResources(matched);

      const existingOffers = await getOffers(accessToken, needId);
      const alreadyOffered = new Set(existingOffers.map((o) => o.citySheetEntryId));
      const newlyOffered = await Promise.all(
        matched
          .filter((resource) => !alreadyOffered.has(resource.id))
          .map((resource) => offerResource(accessToken, needId, resource.id)),
      );
      setOffers([...existingOffers, ...newlyOffered]);
    } catch {
      setError('We could not load resources for this need right now.');
    }
  }, [accessToken, needId]);

  useEffect(() => {
    load();
  }, [load]);

  const responseFor = (entryId: string): ResourceOfferDto['response'] | null => {
    const matching = offers.filter((o) => o.citySheetEntryId === entryId);
    if (matching.length === 0) return null;
    return matching[matching.length - 1].response;
  };

  const decide = async (entryId: string, accepted: boolean) => {
    if (!accessToken) return;
    setDecidingId(entryId);
    try {
      const updated = await respondToOffer(accessToken, needId, entryId, accepted);
      setOffers((prev) => [...prev.filter((o) => o.id !== updated.id), updated]);
    } catch {
      setError('We could not record your response. Please try again.');
    } finally {
      setDecidingId(null);
    }
  };

  if (error) {
    return <ErrorState title="Something went wrong" description={error} />;
  }

  if (resources === null) {
    return <LoadingState label="Looking for resources" />;
  }

  if (resources.length === 0) {
    return (
      <EmptyState
        title="No resources found yet"
        description="Aureus did not find a matching resource for this need. A human steward can help you look further."
      />
    );
  }

  return (
    <div className={styles.list}>
      {resources.map((resource) => (
        <MatchedResourceCard
          key={resource.id}
          resource={resource}
          response={responseFor(resource.id)}
          deciding={decidingId === resource.id}
          onAccept={() => decide(resource.id, true)}
          onDecline={() => decide(resource.id, false)}
        />
      ))}
    </div>
  );
}
