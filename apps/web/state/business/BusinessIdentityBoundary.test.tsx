import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { BusinessProvider, useBusiness } from './BusinessContext';
import * as businessConsoleApi from '../../lib/api/business-console';
import * as organizationsApi from '../../lib/api/organizations';
import type { BusinessTenantSummary } from '../../lib/api/business-console';

jest.mock('../../lib/api/business-console');
jest.mock('../../lib/api/organizations');

const mockedConsole = businessConsoleApi as jest.Mocked<typeof businessConsoleApi>;
const mockedOrganizations = organizationsApi as jest.Mocked<typeof organizationsApi>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

let switchIdentity: (token: string | null, memberId: string | null) => void;

function SessionControls() {
  const { session, setSession } = useSession();
  useEffect(() => {
    switchIdentity = (token, memberId) =>
      setSession({
        ...session,
        isAuthenticated: Boolean(token),
        accessToken: token,
        memberId,
      });
  }, [session, setSession]);
  return null;
}

function VisibleCompany() {
  const { activeTenant, state } = useBusiness();
  if (activeTenant) return <div>{activeTenant.name}</div>;
  if (state.isLoading) return <div>Loading business context</div>;
  return <div>No business context</div>;
}

function tenant(id: string, name: string): BusinessTenantSummary {
  return {
    id,
    organizationRef: null,
    name,
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
    businessProfile: null,
  };
}

describe('Business identity boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it("removes member A's rendered company immediately before member B's fetch resolves", async () => {
    const memberBTenants = deferred<BusinessTenantSummary[]>();

    mockedConsole.listMyBusinessTenants.mockImplementation((token) => {
      if (token === 'token-a') return Promise.resolve([tenant('org-a', "A's Company")]);
      if (token === 'token-b') return memberBTenants.promise;
      return Promise.resolve([]);
    });
    mockedOrganizations.listMyInvitations.mockResolvedValue([]);

    render(
      <SessionProvider>
        <SessionControls />
        <BusinessProvider>
          <VisibleCompany />
        </BusinessProvider>
      </SessionProvider>,
    );

    await act(async () => switchIdentity('token-a', 'member-a'));
    expect(await screen.findByText("A's Company")).toBeInTheDocument();

    act(() => switchIdentity('token-b', 'member-b'));

    expect(screen.queryByText("A's Company")).not.toBeInTheDocument();
    expect(screen.getByText('Loading business context')).toBeInTheDocument();

    await act(async () => {
      memberBTenants.resolve([tenant('org-b', "B's Company")]);
      await Promise.resolve();
    });

    expect(await screen.findByText("B's Company")).toBeInTheDocument();
    expect(screen.queryByText("A's Company")).not.toBeInTheDocument();
  });

  it('clears rendered business identity immediately on logout', async () => {
    mockedConsole.listMyBusinessTenants.mockResolvedValue([tenant('org-a', "A's Company")]);
    mockedOrganizations.listMyInvitations.mockResolvedValue([]);

    render(
      <SessionProvider>
        <SessionControls />
        <BusinessProvider>
          <VisibleCompany />
        </BusinessProvider>
      </SessionProvider>,
    );

    await act(async () => switchIdentity('token-a', 'member-a'));
    expect(await screen.findByText("A's Company")).toBeInTheDocument();

    act(() => switchIdentity(null, null));

    expect(screen.queryByText("A's Company")).not.toBeInTheDocument();
    expect(screen.getByText('No business context')).toBeInTheDocument();
  });
});
