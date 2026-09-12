'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useBusiness } from '../../../../state';

/**
 * Step 1 — Business Identity & Boundary §8/§17 Flow C. Invitations are
 * address-bound, not identity-bound, so this page is deliberately not
 * scoped to any one company — it lists every invitation currently
 * addressed to the signed-in member's own account email, wherever it
 * came from, and lets them accept or decline.
 */
export default function BusinessInvitationsPage() {
  const router = useRouter();
  const { state, acceptInvitation, declineInvitation } = useBusiness();
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const respond = async (invitationId: string, decision: 'accept' | 'decline') => {
    setRespondingId(invitationId);
    if (decision === 'accept') {
      await acceptInvitation(invitationId);
      router.push('/business');
    } else {
      await declineInvitation(invitationId);
    }
    setRespondingId(null);
  };

  return (
    <main style={{ maxWidth: '42rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <p>Business console</p>
      <h1>Your invitations</h1>
      <p>
        A company invited you to work with them through your own Aureus account. Accepting adds
        that company under Business — your Personal Aureus stays exactly as it is.
      </p>

      {state.invitations.length === 0 ? (
        <p>You have no pending invitations right now.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1rem' }}>
          {state.invitations.map((invitation) => (
            <li
              key={invitation.id}
              style={{ border: '1px solid rgba(108, 76, 49, 0.25)', borderRadius: '0.9rem', padding: '1rem' }}
            >
              <p style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>
                {invitation.organizationName ?? 'A company'}
              </p>
              <p style={{ margin: '0 0 0.75rem' }}>
                Invited as <strong>{invitation.role}</strong>.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  disabled={respondingId === invitation.id}
                  onClick={() => void respond(invitation.id, 'accept')}
                >
                  {respondingId === invitation.id ? 'Working…' : 'Accept'}
                </button>
                <button
                  type="button"
                  disabled={respondingId === invitation.id}
                  onClick={() => void respond(invitation.id, 'decline')}
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {state.error ? <p role="alert">{state.error.message}</p> : null}
    </main>
  );
}
