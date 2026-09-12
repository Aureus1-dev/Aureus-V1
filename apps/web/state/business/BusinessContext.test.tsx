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
    id: 'org-1',
    organizationRef: 'AUR-ORG-000001',
    name: 'ABC Kitchen & Bath',
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
    businessProfile: null,
    ...o,
  };
}

function makeInvitation(o: Partial<OrganizationInvitation> = {}): OrganizationInvitation {
  return {
    id: 'inv-1',
    organizationId: 'org-2',
    invitedEmail: 'member@example.com',
    role: 'MEMBER',
    status: 'PENDING',
    invitedById: 'owner-1',
    expiresAt: '2026-12-01T00:00:00Z',
    acceptedAt: null,
    declinedAt: null,
    revokedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...o,
  };
}

interface HarnessApi extends ReturnType<typeof useBusiness> {
  setToken: (t: string | null) => void;
  setIdentity: (token: string | null, memberId: string | null) => void;
}

function Harness({ onReady }: { onReady: (value: HarnessApi) => void }) {
  const business = useBusiness();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...business,
      setToken: (token: string | null) =>
        setSession({
          ...session,
          isAuthenticated: !!token,
          accessToken: token,
          memberId: token ? 'member-1' : null,
        }),
      setIdentity: (token: string | null, memberId: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business, session]);

  return null;
}

function renderHarness() {
  let api!: HarnessApi;
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
    mockedConsoleApi.listMyBusinessTenants.mockResolvedValue([
      makeTenant(),
      makeTenant({ id: 'org-2', name: 'XYZ Construction' }),
    ]);
    mockedOrgApi.listMyInvitations.mockResolvedValue([]);

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    expect(getApi().state.tenants).toHaveLength(2);
    expect(getApi().activeTenant?.id).toBe('org-1');
  });

  it('remembers a previously selected tenant across a refresh', async () => {
    // Scoped to the harness's fixed 'member-1' identity (Step 1 repair #3).
    window.localStorage.setItem('aureus-active-business-tenant:member-1', 'org-2');
    mockedConsoleApi.listMyBusinessTenants.mockResolvedValue([
      makeTenant(),
      makeTenant({ id: 'org-2', name: 'XYZ Construction' }),
    ]);
    mockedOrgApi.listMyInvitations.mockResolvedValue([]);

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    expect(getApi().activeTenant?.id).toBe('org-2');
  });

  it('switches the active tenant and persists the choice, scoped to the authenticated member', async () => {
    mockedConsoleApi.listMyBusinessTenants.mockResolvedValue([
      makeTenant(),
      makeTenant({ id: 'org-2', name: 'XYZ Construction' }),
    ]);
    mockedOrgApi.listMyInvitations.mockResolvedValue([]);

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    act(() => getApi().selectTenant('org-2'));

    expect(getApi().activeTenant?.id).toBe('org-2');
    expect(window.localStorage.getItem('aureus-active-business-tenant:member-1')).toBe('org-2');
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

  describe('identity changes (Step 1 repair #3)', () => {
    it('clears tenants, invitations, and the active tenant immediately on logout', async () => {
      mockedConsoleApi.listMyBusinessTenants.mockResolvedValue([makeTenant()]);
      mockedOrgApi.listMyInvitations.mockResolvedValue([makeInvitation()]);

      const getApi = renderHarness();
      await act(async () => getApi().setToken('token-123'));
      expect(getApi().state.tenants).toHaveLength(1);
      expect(getApi().state.invitations).toHaveLength(1);
      expect(getApi().activeTenant?.id).toBe('org-1');

      act(() => getApi().setToken(null));

      expect(getApi().state.tenants).toHaveLength(0);
      expect(getApi().state.invitations).toHaveLength(0);
      expect(getApi().activeTenant).toBeNull();
      expect(getApi().state.isLoading).toBe(false);
    });

    it("clears member A's state before loading member B's, and never lets member A's data render for member B", async () => {
      mockedConsoleApi.listMyBusinessTenants.mockResolvedValueOnce([
        makeTenant({ id: 'org-a', name: "A's Company" }),
      ]);
      mockedOrgApi.listMyInvitations.mockResolvedValueOnce([]);

      const getApi = renderHarness();
      await act(async () => getApi().setToken('token-a'));
      expect(getApi().activeTenant?.name).toBe("A's Company");

      // Member B's fetch resolves slowly — while it's in flight, member A's
      // data must already be gone, not still on screen "until B loads".
      let resolveTenantsForB!: (value: BusinessTenantSummary[]) => void;
      mockedConsoleApi.listMyBusinessTenants.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveTenantsForB = resolve;
        }),
      );
      mockedOrgApi.listMyInvitations.mockResolvedValueOnce([]);

      act(() => getApi().setIdentity('token-b', 'member-b'));

      expect(getApi().state.tenants).toHaveLength(0);
      expect(getApi().activeTenant).toBeNull();
      expect(getApi().state.isLoading).toBe(true);

      await act(async () => {
        resolveTenantsForB([makeTenant({ id: 'org-b', name: "B's Company" })]);
        await Promise.resolve();
      });

      expect(getApi().activeTenant?.name).toBe("B's Company");
    });

    it("does not leak member A's remembered active-tenant preference into member B's default selection", async () => {
      window.localStorage.setItem('aureus-active-business-tenant:member-a', 'org-a-secondary');
      mockedConsoleApi.listMyBusinessTenants.mockResolvedValueOnce([
        makeTenant({ id: 'org-a-secondary', name: "A's Secondary" }),
      ]);
      mockedOrgApi.listMyInvitations.mockResolvedValueOnce([]);

      const getApi = renderHarness();
      await act(async () => getApi().setIdentity('token-a', 'member-a'));
      expect(getApi().activeTenant?.id).toBe('org-a-secondary');

      // Member B belongs to a different company and has never selected
      // anything — B must default to their own first tenant, never fall
      // back to reading A's stored preference under B's identity.
      mockedConsoleApi.listMyBusinessTenants.mockResolvedValueOnce([
        makeTenant({ id: 'org-b-primary', name: "B's Company" }),
      ]);
      mockedOrgApi.listMyInvitations.mockResolvedValueOnce([]);

      await act(async () => getApi().setIdentity('token-b', 'member-b'));

      expect(getApi().activeTenant?.id).toBe('org-b-primary');
    });
  });
});
