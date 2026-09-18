import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { TrustCenterTab } from './TrustCenterTab';
import * as authorityApi from '../../../lib/api/authority';

jest.mock('../../../lib/api/authority');
const api = authorityApi as jest.Mocked<typeof authorityApi>;

function SignedIn({ children }: { children: React.ReactNode }) {
  const { session, setSession } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token', memberId: 'member-1' });
  }
  return <>{children}</>;
}

const snapshot: authorityApi.AuthorityTrustSnapshot = {
  policyVersion: 'people-step2-v2',
  requests: [{
    id: 'r1',
    contextType: 'PERSONAL',
    subjectUserId: 'member-1',
    organizationId: null,
    capability: 'SHARE',
    resourceClass: 'DOCUMENT',
    resourceRef: 'document-1',
    purpose: 'Share only the proof needed for this application',
    shareRecipientKind: 'PROVIDER',
    shareRecipientRef: 'provider-123',
    shareDataFields: ['name', 'eligibility_status'],
    source: 'USER',
    status: 'PENDING',
    expiresAt: '2026-09-20T15:00:00.000Z',
    canApprove: true,
    canDeny: true,
    createdAt: 'x',
  }],
  grants: [{
    id: 'g1',
    contextType: 'PERSONAL',
    subjectUserId: 'member-1',
    organizationId: null,
    capability: 'READ',
    resourceClass: 'DOCUMENT',
    resourceRef: 'document-2',
    purpose: 'Read this exact document for this task',
    shareRecipientKind: null,
    shareRecipientRef: null,
    shareDataFields: [],
    status: 'ACTIVE',
    expiresAt: null,
    canRevoke: true,
    createdAt: 'x',
  }],
  states: [{
    id: 's1',
    contextType: 'PERSONAL',
    subjectUserId: 'member-1',
    organizationId: null,
    capability: 'ACT',
    status: 'SUSPENDED',
    suspendedReason: 'Member suspended this capability',
    updatedAt: 'x',
  }],
  events: [{
    id: 'e1',
    eventType: 'GRANT_CREATED',
    capability: 'READ',
    resourceClass: 'DOCUMENT',
    reason: null,
    occurredAt: 'x',
  }],
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

  it('shows exact resource, recipient, and minimum-data scope before approval', async () => {
    render(<SessionProvider><SignedIn><TrustCenterTab /></SignedIn></SessionProvider>);

    expect(await screen.findByText('You stay in control.')).toBeInTheDocument();
    expect(screen.getByText(/does not reduce your standing with Aureus/i)).toBeInTheDocument();
    expect(screen.getByText('document-1')).toBeInTheDocument();
    expect(screen.getByText(/provider · provider-123/i)).toBeInTheDocument();
    expect(screen.getByText(/name, eligibility_status/i)).toBeInTheDocument();
    expect(screen.getByText(/Ends automatically/i)).toBeInTheDocument();
    expect(screen.getByText(/take this permission back here at any time/i)).toBeInTheDocument();
  });

  it('exposes approve, deny, revoke, suspend, and restore with truthful continuation copy', async () => {
    const user = userEvent.setup();
    render(<SessionProvider><SignedIn><TrustCenterTab /></SignedIn></SessionProvider>);

    await screen.findByText('You stay in control.');

    await user.click(screen.getByRole('button', { name: 'Allow' }));
    expect(api.approveAuthorityRequest).toHaveBeenCalledWith('token', 'r1');

    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(api.denyAuthorityRequest).toHaveBeenCalledWith('token', 'r1');
    expect(await screen.findByText(/Permission not granted/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Take permission back' }));
    expect(api.revokeAuthorityGrant).toHaveBeenCalledWith('token', 'g1');
    expect(await screen.findByText(/Permission is off now/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: "Aureus shouldn't have done this" }));
    expect(api.suspendAuthorityCapability).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Restore capability' }));
    expect(api.resumeAuthorityCapability).toHaveBeenCalled();
    expect(await screen.findByText(/does not recreate any permission/i)).toBeInTheDocument();
  });
});
