import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { BusinessProvider, useBusiness } from './BusinessContext';
import * as businessConsoleApi from '../../lib/api/business-console';
import * as organizationsApi from '../../lib/api/organizations';
import type { BusinessTenantSummary } from '../../lib/api/business-console';
import type { OrganizationInvitation } from '../../lib/api/organizations';

jest.mock('../../lib/api/business-console');
jest.mock('../../lib/api/organizations');

const mockedConsoleApi = businessConsoleApi as jest.Mocked<typeof businessConsoleApi>;
const mockedOrgApi = organizationsApi as jest.Mocked<typeof organizationsApi>;

function makeTenant(o: Partial<BusinessTenantSummary> = {}): BusinessTenantSummary {
  return {
    id: 'org-1', organizationRef: 'AUR-ORG-000001', name: 'ABC Kitchen & Bath',
    status: 'ACTIVE', verificationStatus: 'VERIFIED', businessProfile: null, ...o,
  };
}

function makeInvitation(o: Partial<OrganizationInvitation> = {}): OrganizationInvitation {
  return {
    id: 'inv-1', organizationId: 'org-2', invitedEmail: 'member@example.com', role: 'MEMBER',
    status: 'PENDING', invitedById: 'owner-1', expiresAt: '2026-12-01T00:00:00Z',
    acceptedAt: null, declinedAt: null, revokedAt: null, createdAt: '2026-01-01T00:00:00Z', ...o,
  };
}

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useBusiness> & { setToken: (t: string | null) => void }) => void }) {
  const business = useBusiness();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...business,
      setToken: (token: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId: token ? 'member-1' : null }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useBusiness> & { setToken: (t: string | null) => void };
  render(
    <SessionProvider>
      <BusinessProvider>
        <Harness onReady={(value) => (api = value)} />
      </BusinessProvider>
    </SessionProvider>,
  );
  return () => api;
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
});

describe('BusinessContext', () => {
  it('loads tenants and invitations, defaulting the active tenant to the first one', async () => {
    mockedConsoleApi.listMyBusinessTenants.mockResolvedValue([makeTenant(), makeTenant({ id: 'org-2', name: 'XYZ Construction' })]);
    mockedOrgApi.listMyInvitations.mockResolvedValue([]);

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    expect(getApi().state.tenants).toHaveLength(2);
    expect(getApi().activeTenant?.id).toBe('org-1');
  });

  it('remembers a previously selected tenant across a refresh', async () => {
    window.localStorage.setItem('aureus-active-business-tenant', 'org-2');
    mockedConsoleApi.listMyBusinessTenants.mockResolvedValue([makeTenant(), makeTenant({ id: 'org-2', name: 'XYZ Construction' })]);
    mockedOrgApi.listMyInvitations.mockResolvedValue([]);

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    expect(getApi().activeTenant?.id).toBe('org-2');
  });

  it('switches the active tenant and persists the choice', async () => {
    mockedConsoleApi.listMyBusinessTenants.mockResolvedValue([makeTenant(), makeTenant({ id: 'org-2', name: 'XYZ Construction' })]);
    mockedOrgApi.listMyInvitations.mockResolvedValue([]);

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    act(() => getApi().selectTenant('org-2'));

    expect(getApi().activeTenant?.id).toBe('org-2');
    expect(window.localStorage.getItem('aureus-active-business-tenant')).toBe('org-2');
  });

  it('exposes pending invitations addressed to the caller', async () => {
    mockedConsoleApi.listMyBusinessTenants.mockResolvedValue([]);
    mockedOrgApi.listMyInvitations.mockResolvedValue([makeInvitation()]);

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    expect(getApi().state.invitations).toHaveLength(1);
  });

  it('accepting an invitation removes it and refreshes tenants', async () => {
    mockedConsoleApi.listMyBusinessTenants
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeTenant({ id: 'org-2', name: 'XYZ Construction' })]);
    mockedOrgApi.listMyInvitations
      .mockResolvedValueOnce([makeInvitation()])
      .mockResolvedValueOnce([]);
    mockedOrgApi.acceptInvitation.mockResolvedValue(makeInvitation({ status: 'ACCEPTED' }));

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    expect(getApi().state.invitations).toHaveLength(1);

    await act(async () => getApi().acceptInvitation('inv-1'));

    expect(mockedOrgApi.acceptInvitation).toHaveBeenCalledWith('token-123', 'inv-1');
    expect(getApi().state.invitations).toHaveLength(0);
    expect(getApi().activeTenant?.id).toBe('org-2');
  });

  it('declining an invitation removes it from the pending list', async () => {
    mockedConsoleApi.listMyBusinessTenants.mockResolvedValue([]);
    mockedOrgApi.listMyInvitations.mockResolvedValue([makeInvitation()]);
    mockedOrgApi.declineInvitation.mockResolvedValue(makeInvitation({ status: 'DECLINED' }));

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    await act(async () => getApi().declineInvitation('inv-1'));

    expect(mockedOrgApi.declineInvitation).toHaveBeenCalledWith('token-123', 'inv-1');
    expect(getApi().state.invitations).toHaveLength(0);
  });
});
