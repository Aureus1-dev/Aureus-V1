'use client';

import { useEffect, useState } from 'react';
import { usePods } from '../../../state';
import { Button } from '../Button/Button';
import { FormField } from '../FormField/FormField';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { domainErrorCopy } from '../domain-error-copy';
import { PodCard } from './PodCard';
import styles from './DiscoverTab.module.css';

/**
 * Discover — browse and search Pods, request to join one, or propose a
 * new one entirely (Article VIII's Freedom of Belonging, PR-002). A
 * request never joins the Pod directly: the target Pod's Steward or an
 * Administrator decides (`PodRequestsController.decide`).
 */
export function DiscoverTab() {
  const { state, search, requestToJoin, proposeNewPod } = usePods();
  const [query, setQuery] = useState('');
  const [isProposing, setIsProposing] = useState(false);
  const [proposedName, setProposedName] = useState('');
  const [proposedDescription, setProposedDescription] = useState('');

  useEffect(() => {
    void search({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const errorCopy = state.error ? domainErrorCopy(state.error.kind) : null;
  const requestedPodIds = new Set(
    state.requests.filter((r) => r.status === 'PENDING' && r.podId).map((r) => r.podId),
  );

  return (
    <div className={styles.tab}>
      <form
        className={styles.searchForm}
        onSubmit={(event) => {
          event.preventDefault();
          void search({ q: query || undefined });
        }}
      >
        <FormField id="pods-search" label="Search Pods" value={query} onChange={setQuery} placeholder="Name or description" />
        <Button type="submit">Search</Button>
      </form>

      {state.isSearching ? <LoadingState label="Searching Pods" /> : null}

      {errorCopy && state.results.length === 0 && !state.isSearching ? (
        <ErrorState title={errorCopy.title} description={errorCopy.description} />
      ) : null}

      {!state.isSearching && !state.error && state.results.length === 0 ? (
        <EmptyState title="No Pods found" description="Try a different search, or propose a new Pod below." />
      ) : null}

      {state.results.length > 0 ? (
        <div className={styles.results}>
          {state.results.map((pod) => (
            <PodCard
              key={pod.id}
              pod={pod}
              alreadyRequested={requestedPodIds.has(pod.id)}
              isSubmitting={state.updatingId === pod.id}
              onRequestToJoin={() => void requestToJoin(pod.id)}
            />
          ))}
        </div>
      ) : null}

      <div className={styles.propose}>
        {!isProposing ? (
          <Button variant="secondary" onClick={() => setIsProposing(true)}>
            Propose a new Pod
          </Button>
        ) : (
          <form
            className={styles.proposeForm}
            onSubmit={(event) => {
              event.preventDefault();
              void proposeNewPod(proposedName, proposedDescription);
              setIsProposing(false);
              setProposedName('');
              setProposedDescription('');
            }}
          >
            <FormField
              id="pods-propose-name"
              label="Pod name"
              value={proposedName}
              onChange={setProposedName}
              required
              minLength={3}
            />
            <label className={styles.textareaField} htmlFor="pods-propose-description">
              <span className={styles.label}>Description</span>
              <textarea
                id="pods-propose-description"
                className={styles.textarea}
                value={proposedDescription}
                onChange={(event) => setProposedDescription(event.target.value)}
                minLength={10}
                required
                rows={3}
              />
            </label>
            <div className={styles.actions}>
              <Button type="submit">Submit proposal</Button>
              <Button type="button" variant="secondary" onClick={() => setIsProposing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
