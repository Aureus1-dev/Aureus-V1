'use client';

import { useEffect } from 'react';
import { usePods } from '../../../state';
import { Card } from '../Card/Card';
import { Button } from '../Button/Button';
import { LoadingState } from '../LoadingState/LoadingState';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { domainErrorCopy } from '../domain-error-copy';
import styles from './MyPodsTab.module.css';

const REQUEST_TYPE_LABEL: Record<string, string> = {
  JOIN: 'Join', LEAVE: 'Leave', REASSIGNMENT: 'Reassignment', PROPOSE_NEW_POD: 'New Pod proposal',
};

/**
 * My Pods — everything the member owns in the Pods relationship: Pods
 * they belong to, invitations awaiting a response (including proactive
 * Home Pod suggestions, never automatic assignment — Founder Decision
 * #1), and the status of their own requests (PR-002).
 */
export function MyPodsTab() {
  const { state, loadMine, respondToInvitation, respondToMembership, leavePod, withdrawRequest } = usePods();

  useEffect(() => {
    void loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMine]);

  const errorCopy = state.error ? domainErrorCopy(state.error.kind) : null;
  const pendingInvitations = state.invitations.filter((i) => i.status === 'PENDING');
  const pendingSuggestions = state.memberships.filter((m) => m.status === 'PENDING');
  const activeMemberships = state.memberships.filter((m) => m.status === 'ACTIVE');
  const pendingRequests = state.requests.filter((r) => r.status === 'PENDING');
  const decidedRequests = state.requests.filter((r) => r.status !== 'PENDING');

  const isEmpty =
    pendingInvitations.length === 0 &&
    pendingSuggestions.length === 0 &&
    activeMemberships.length === 0 &&
    state.requests.length === 0;

  if (state.isLoadingMine && isEmpty) {
    return <LoadingState label="Loading your Pods" />;
  }

  if (errorCopy && isEmpty && !state.isLoadingMine) {
    return <ErrorState title={errorCopy.title} description={errorCopy.description} />;
  }

  if (!state.isLoadingMine && isEmpty) {
    return (
      <EmptyState
        title="You're not part of a Pod yet"
        description="Browse the Discover tab to find a Pod, or propose a new one."
      />
    );
  }

  return (
    <div className={styles.tab}>
      {pendingInvitations.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Invitations</h2>
          <div className={styles.list}>
            {pendingInvitations.map((invitation) => (
              <Card key={invitation.id} className={styles.item}>
                <p className={styles.itemTitle}>
                  Invited to {state.podsById[invitation.podId]?.name ?? 'a Pod'}
                </p>
                {invitation.message ? <p className={styles.itemDetail}>{invitation.message}</p> : null}
                <div className={styles.actions}>
                  <Button
                    disabled={state.updatingId === invitation.id}
                    onClick={() => void respondToInvitation(invitation.id, 'ACCEPT')}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={state.updatingId === invitation.id}
                    onClick={() => void respondToInvitation(invitation.id, 'DECLINE')}
                  >
                    Decline
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {pendingSuggestions.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Pod suggestions</h2>
          <div className={styles.list}>
            {pendingSuggestions.map((membership) => (
              <Card key={membership.id} className={styles.item}>
                <p className={styles.itemTitle}>{state.podsById[membership.podId]?.name ?? 'A Pod'}</p>
                <p className={styles.itemDetail}>
                  A Home Pod suggestion — you decide whether to accept, decline, or think it over.
                </p>
                <div className={styles.actions}>
                  <Button
                    disabled={state.updatingId === membership.id}
                    onClick={() => void respondToMembership(membership.id, 'ACCEPT')}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={state.updatingId === membership.id}
                    onClick={() => void respondToMembership(membership.id, 'DEFER')}
                  >
                    Decide later
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={state.updatingId === membership.id}
                    onClick={() => void respondToMembership(membership.id, 'DECLINE')}
                  >
                    Decline
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {activeMemberships.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Your Pods</h2>
          <div className={styles.list}>
            {activeMemberships.map((membership) => (
              <Card key={membership.id} className={styles.item}>
                <p className={styles.itemTitle}>{state.podsById[membership.podId]?.name ?? 'A Pod'}</p>
                <p className={styles.itemDetail}>{membership.role === 'STEWARD' ? 'Steward' : 'Member'}</p>
                <Button
                  variant="secondary"
                  disabled={state.updatingId === membership.id}
                  onClick={() => void leavePod(membership.id)}
                >
                  Leave Pod
                </Button>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {pendingRequests.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Pending requests</h2>
          <div className={styles.list}>
            {pendingRequests.map((request) => (
              <Card key={request.id} className={styles.item}>
                <p className={styles.itemTitle}>
                  {REQUEST_TYPE_LABEL[request.type]}
                  {request.podId ? `: ${state.podsById[request.podId]?.name ?? 'a Pod'}` : ''}
                  {request.proposedPodName ? `: ${request.proposedPodName}` : ''}
                </p>
                <Button
                  variant="secondary"
                  disabled={state.updatingId === request.id}
                  onClick={() => void withdrawRequest(request.id)}
                >
                  Withdraw
                </Button>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {decidedRequests.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Past requests</h2>
          <div className={styles.list}>
            {decidedRequests.map((request) => (
              <Card key={request.id} className={styles.item}>
                <p className={styles.itemTitle}>
                  {REQUEST_TYPE_LABEL[request.type]}
                  {request.podId ? `: ${state.podsById[request.podId]?.name ?? 'a Pod'}` : ''}
                  {request.proposedPodName ? `: ${request.proposedPodName}` : ''}
                </p>
                <p className={styles.itemDetail}>{request.status[0] + request.status.slice(1).toLowerCase()}</p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
