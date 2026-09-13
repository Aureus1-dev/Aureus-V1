'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../../state';
import {
  approveAuthorityRequest,
  denyAuthorityRequest,
  getAuthorityTrust,
  resumeAuthorityCapability,
  revokeAuthorityGrant,
  suspendAuthorityCapability,
  type AuthorityTrustSnapshot,
} from '../../../lib/api/authority';
import { Button } from '../Button/Button';
import { EmptyState } from '../EmptyState/EmptyState';
import { ErrorState } from '../ErrorState/ErrorState';
import { LoadingState } from '../LoadingState/LoadingState';

export function TrustCenterTab() {
  const { session } = useSession();
  const [snapshot, setSnapshot] = useState<AuthorityTrustSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!session.accessToken) return;
    try {
      setError(null);
      setSnapshot(await getAuthorityTrust(session.accessToken));
    } catch {
      setError('Trust & Permissions could not be loaded.');
    }
  }, [session.accessToken]);

  useEffect(() => { void load(); }, [load]);

  async function act(operation: () => Promise<unknown>) {
    setBusy(true);
    try { await operation(); await load(); }
    catch { setError('That permission change could not be completed. Nothing was silently changed.'); }
    finally { setBusy(false); }
  }

  if (!session.accessToken) return <EmptyState title="Sign in to manage trust" description="Your permissions belong to your Aureus identity." />;
  if (error) return <ErrorState title="Trust & Permissions unavailable" description={error} action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>} />;
  if (!snapshot) return <LoadingState label="Loading your permissions" />;

  const pending = snapshot.requests.filter((request) => request.status === 'PENDING');
  const active = snapshot.grants.filter((grant) => grant.status === 'ACTIVE');
  const suspended = snapshot.states.filter((state) => state.status === 'SUSPENDED');

  return (
    <div>
      <p><strong>You stay in control.</strong> Aureus asks before taking new authority. You can take permission back just as directly.</p>
      <p>Your employer cannot approve your microphone, screen, connected accounts, or private conversations for you.</p>

      <section aria-labelledby="trust-requests">
        <h3 id="trust-requests">Asking for permission</h3>
        {pending.length === 0 ? <p>Nothing is waiting for your approval.</p> : pending.map((request) => (
          <article key={request.id}>
            <strong>{request.capability} · {request.resourceClass}</strong>
            <p>{request.purpose}</p>
            <p>{request.source === 'DERIVED_PATTERN' ? 'Aureus noticed a pattern. This is only a proposal until you approve it.' : 'This request gives no authority until the right person approves it.'}</p>
            {request.canApprove ? <>
              <Button variant="primary" disabled={busy} onClick={() => void act(() => approveAuthorityRequest(session.accessToken!, request.id))}>Allow</Button>{' '}
              <Button variant="secondary" disabled={busy} onClick={() => void act(() => denyAuthorityRequest(session.accessToken!, request.id))}>Not now</Button>
            </> : <p>Only the person who controls this information can approve it.</p>}
          </article>
        ))}
      </section>

      <section aria-labelledby="trust-active">
        <h3 id="trust-active">What Aureus may do</h3>
        {active.length === 0 ? <p>No active runtime permissions.</p> : active.map((grant) => (
          <article key={grant.id}>
            <strong>{grant.capability} · {grant.resourceClass}</strong>
            <p>{grant.purpose}</p>
            {grant.expiresAt ? <p>Ends automatically: {new Date(grant.expiresAt).toLocaleString()}</p> : null}
            {grant.canRevoke ? <>
              <Button variant="secondary" disabled={busy} onClick={() => void act(() => revokeAuthorityGrant(session.accessToken!, grant.id))}>Take permission back</Button>{' '}
              <Button variant="secondary" disabled={busy} onClick={() => void act(() => suspendAuthorityCapability(session.accessToken!, grant))}>Aureus shouldn&apos;t have done this</Button>
            </> : null}
          </article>
        ))}
      </section>

      <section aria-labelledby="trust-suspended">
        <h3 id="trust-suspended">Suspended capabilities</h3>
        {suspended.length === 0 ? <p>Nothing is suspended.</p> : suspended.map((state) => (
          <article key={state.id}>
            <strong>{state.capability} is suspended</strong>
            <p>{state.suspendedReason ?? 'This capability cannot run in this scope.'}</p>
            <Button variant="secondary" disabled={busy} onClick={() => void act(() => resumeAuthorityCapability(session.accessToken!, state))}>Restore capability</Button>
          </article>
        ))}
      </section>

      <section aria-labelledby="trust-history">
        <h3 id="trust-history">Recent permission history</h3>
        {snapshot.events.length === 0 ? <p>No permission history yet.</p> : <ul>{snapshot.events.slice(0, 12).map((event) => (
          <li key={event.id}>{event.eventType.replaceAll('_', ' ').toLowerCase()} {event.capability ? `· ${event.capability}` : ''}</li>
        ))}</ul>}
      </section>
    </div>
  );
}
