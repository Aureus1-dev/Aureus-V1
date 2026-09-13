import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { TrustCenterTab } from './TrustCenterTab';
import * as authorityApi from '../../../lib/api/authority';

jest.mock('../../../lib/api/authority');
const api = authorityApi as jest.Mocked<typeof authorityApi>;

function SignedIn({ children }: { children: React.ReactNode }) {
  const { session, setSession } = useSession();
  if (!session.isAuthenticated) setSession({ ...session, isAuthenticated: true, accessToken: 'token', memberId: 'member-1' });
  return <>{children}</>;
}

const snapshot: authorityApi.AuthorityTrustSnapshot = {
  policyVersion: 'step2-v1',
  requests: [{ id: 'r1', contextType: 'PERSONAL', subjectUserId: 'member-1', organizationId: null, capability: 'READ', resourceClass: 'FILES', resourceRef: null, purpose: 'Read files I choose', source: 'USER', status: 'PENDING', canApprove: true, canDeny: true, createdAt: 'x' }],
  grants: [{ id: 'g1', contextType: 'PERSONAL', subjectUserId: 'member-1', organizationId: null, capability: 'LISTEN', resourceClass: 'MICROPHONE', resourceRef: null, purpose: 'Listen while I work', status: 'ACTIVE', expiresAt: null, canRevoke: true, createdAt: 'x' }],
  states: [{ id: 's1', contextType: 'PERSONAL', subjectUserId: 'member-1', organizationId: null, capability: 'ACT', status: 'SUSPENDED', suspendedReason: 'Member suspended this capability', updatedAt: 'x' }],
  events: [{ id: 'e1', eventType: 'GRANT_CREATED', capability: 'LISTEN', resourceClass: 'MICROPHONE', reason: null, occurredAt: 'x' }],
  decisions: [],
};

describe('TrustCenterTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.getAuthorityTrust.mockResolvedValue(snapshot);
    api.approveAuthorityRequest.mockResolvedValue({});
    api.denyAuthorityRequest.mockResolvedValue({});
    api.revokeAuthorityGrant.mockResolvedValue({});
    api.suspendAuthorityCapability.mockResolvedValue({});
    api.resumeAuthorityCapability.mockResolvedValue({});
  });

  it('explains control plainly and exposes approve, deny, revoke, suspend, and restore actions', async () => {
    render(<SessionProvider><SignedIn><TrustCenterTab /></SignedIn></SessionProvider>);
    expect(await screen.findByText('You stay in control.')).toBeInTheDocument();
    expect(screen.getByText(/employer cannot approve your microphone/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Allow' }));
    expect(api.approveAuthorityRequest).toHaveBeenCalledWith('token', 'r1');
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));
    expect(api.denyAuthorityRequest).toHaveBeenCalledWith('token', 'r1');
    await userEvent.click(screen.getByRole('button', { name: 'Take permission back' }));
    expect(api.revokeAuthorityGrant).toHaveBeenCalledWith('token', 'g1');
    await userEvent.click(screen.getByRole('button', { name: "Aureus shouldn't have done this" }));
    expect(api.suspendAuthorityCapability).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Restore capability' }));
    expect(api.resumeAuthorityCapability).toHaveBeenCalled();
  });
});
