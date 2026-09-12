import { useEffect } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { BusinessProvider } from '../../../state/business/BusinessContext';
import { BusinessContextSwitcher } from './BusinessContextSwitcher';
import { BusinessOperationsPanel } from './BusinessOperationsPanel';
import * as businessConsoleApi from '../../../lib/api/business-console';
import * as organizationsApi from '../../../lib/api/organizations';
import * as businessOperationsApi from '../../../lib/api/business-operations';
import type {
  BusinessOperationsSummary,
  BusinessLeadSummary,
  BusinessLeadDetail,
} from '../../../lib/api/business-operations';

jest.mock('../../../lib/api/business-console');
jest.mock('../../../lib/api/organizations');
jest.mock('../../../lib/api/business-operations');

const mockedConsole = businessConsoleApi as jest.Mocked<typeof businessConsoleApi>;
const mockedOrgs = organizationsApi as jest.Mocked<typeof organizationsApi>;
const mockedOps = businessOperationsApi as jest.Mocked<typeof businessOperationsApi>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function summaryFor(companyLabel: string): BusinessOperationsSummary {
  return {
    generatedAt: '2026-09-02T00:00:00.000Z',
    pipeline: {
      total: 1,
      counts: { SUBMITTED: 1, ACCEPTED: 0, CONTACTED: 0, CLOSED: 0, LOST: 0 },
      awaitingNotification: 0,
      oldestOpenSubmittedAt: '2026-09-02T00:00:00.000Z',
    },
    routing: {
      publicStatus: 'PUBLISHED',
      businessHours: {},
      contactRoutes: [],
      escalationTarget: null,
      fallbackRule: 'Use the configured human route.',
      updatedAt: null,
    },
    knowledge: { total: 0, currentApproved: 0, dueOrReviewing: 0, queue: [] },
    provider: {
      basis: `Observed ${companyLabel} traffic only.`,
      windowStartedAt: '2026-09-01T00:00:00.000Z',
      status: 'NO_TRAFFIC',
      requests: 0,
      successes: 0,
      failures: 0,
      moderationBlocks: 0,
      spendUsd: 0,
      averageLatencyMs: null,
      latestObservedAt: null,
      providers: [],
    },
    owners: [
      { userId: 'owner-1', role: 'OWNER', email: 'owner@example.com', displayName: 'Owner' },
    ],
  };
}

function leadFor(companyLabel: string, id: string): BusinessLeadSummary {
  return {
    id,
    displayName: `${companyLabel} Lead`,
    contactMethod: 'EMAIL',
    contactValue: `${companyLabel.toLowerCase()}@example.com`,
    projectSummary: `${companyLabel} project summary.`,
    projectLocation: null,
    desiredTiming: null,
    qualificationSignals: [],
    status: 'SUBMITTED',
    assignedToId: 'owner-1',
    submittedAt: '2026-09-02T00:00:00.000Z',
    lastStateChangedAt: '2026-09-02T00:00:00.000Z',
    retentionExpiresAt: '2026-12-01T00:00:00.000Z',
    assignmentNotifiedAt: null,
    assignee: {
      user: { id: 'owner-1', email: 'owner@example.com', profile: { displayName: 'Owner' } },
    },
  };
}

function detailFor(companyLabel: string, id: string): BusinessLeadDetail {
  return {
    ...leadFor(companyLabel, id),
    outcomeReason: null,
    readyProject: null,
    events: [],
    conversation: {
      id: `${id}-conv`,
      status: 'OPEN',
      turnCount: 0,
      createdAt: '2026-09-02T00:00:00.000Z',
      messages: [],
    },
  };
}

function Login({ token }: { token: string }) {
  const { setSession, session } = useSession();
  useEffect(() => {
    setSession({ ...session, isAuthenticated: true, accessToken: token, memberId: 'member-1' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function renderApp() {
  return render(
    <SessionProvider>
      <Login token="token-123" />
      <BusinessProvider>
        <BusinessContextSwitcher />
        <BusinessOperationsPanel />
      </BusinessProvider>
    </SessionProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();

  mockedConsole.listMyBusinessTenants.mockResolvedValue([
    {
      id: 'tenant-a',
      organizationRef: null,
      name: 'Alpha Co',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      businessProfile: null,
    },
    {
      id: 'tenant-b',
      organizationRef: null,
      name: 'Beta Co',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      businessProfile: null,
    },
  ]);
  mockedOrgs.listMyInvitations.mockResolvedValue([]);

  mockedOps.getBusinessOperationsSummary.mockImplementation(async (_token, tenantId) =>
    summaryFor(tenantId === 'tenant-a' ? 'Alpha Co' : 'Beta Co'),
  );
  mockedOps.listBusinessLeads.mockImplementation(async (_token, tenantId) => [
    leadFor(
      tenantId === 'tenant-a' ? 'Alpha Co' : 'Beta Co',
      tenantId === 'tenant-a' ? 'lead-a' : 'lead-b',
    ),
  ]);
  mockedOps.getBusinessLead.mockImplementation(async (_token, tenantId, leadId) =>
    detailFor(tenantId === 'tenant-a' ? 'Alpha Co' : 'Beta Co', leadId),
  );
  mockedOps.transitionBusinessLead.mockImplementation(async (_token, tenantId, leadId, status) => ({
    ...detailFor(tenantId === 'tenant-a' ? 'Alpha Co' : 'Beta Co', leadId),
    status,
  }));
});

describe('Company A → Company B tenant switching (Step 1 repair)', () => {
  it("drops Company A's records immediately and loads Company B's on switch — no stale record stays actionable", async () => {
    renderApp();

    expect(await screen.findByRole('button', { name: /Alpha Co Lead/ })).toBeInTheDocument();
    expect(mockedOps.listBusinessLeads).toHaveBeenLastCalledWith('token-123', 'tenant-a');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Beta Co' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /Alpha Co Lead/ })).not.toBeInTheDocument(),
    );

    expect(await screen.findByRole('button', { name: /Beta Co Lead/ })).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedOps.listBusinessLeads).toHaveBeenLastCalledWith('token-123', 'tenant-b'),
    );
  });

  it('routes a mutation issued after switching to Company B, never to Company A', async () => {
    renderApp();
    const user = userEvent.setup();

    await screen.findByRole('button', { name: /Alpha Co Lead/ });
    await user.click(screen.getByRole('button', { name: 'Beta Co' }));
    const betaLeadButton = await screen.findByRole('button', { name: /Beta Co Lead/ });

    await user.click(betaLeadButton);
    const markAccepted = await screen.findByRole('button', { name: /Mark accepted/i });
    await user.click(markAccepted);

    await waitFor(() =>
      expect(mockedOps.transitionBusinessLead).toHaveBeenCalledWith(
        'token-123',
        'tenant-b',
        'lead-b',
        'ACCEPTED',
        undefined,
      ),
    );
    expect(mockedOps.transitionBusinessLead).not.toHaveBeenCalledWith(
      'token-123',
      'tenant-a',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('discards a slow Company A read that resolves after Company B has fully loaded', async () => {
    const alphaSummary = deferred<BusinessOperationsSummary>();
    const alphaLeads = deferred<BusinessLeadSummary[]>();

    mockedOps.getBusinessOperationsSummary.mockImplementation((_token, tenantId) =>
      tenantId === 'tenant-a'
        ? alphaSummary.promise
        : Promise.resolve(summaryFor('Beta Co')),
    );
    mockedOps.listBusinessLeads.mockImplementation((_token, tenantId) =>
      tenantId === 'tenant-a'
        ? alphaLeads.promise
        : Promise.resolve([leadFor('Beta Co', 'lead-b')]),
    );

    renderApp();
    const user = userEvent.setup();

    expect(await screen.findByRole('button', { name: 'Beta Co' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Beta Co' }));
    expect(await screen.findByRole('button', { name: /Beta Co Lead/ })).toBeInTheDocument();

    await act(async () => {
      alphaSummary.resolve(summaryFor('Alpha Co'));
      alphaLeads.resolve([leadFor('Alpha Co', 'lead-a')]);
      await Promise.resolve();
    });

    expect(screen.getByRole('button', { name: /Beta Co Lead/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Alpha Co Lead/ })).not.toBeInTheDocument();
  });

  it('does not let completion of a Company A mutation repopulate A after switching to B', async () => {
    const alphaMutation = deferred<BusinessLeadDetail>();
    renderApp();
    const user = userEvent.setup();

    const alphaLead = await screen.findByRole('button', { name: /Alpha Co Lead/ });
    await user.click(alphaLead);
    const markAccepted = await screen.findByRole('button', { name: /Mark accepted/i });
    mockedOps.transitionBusinessLead.mockReturnValueOnce(alphaMutation.promise);
    await user.click(markAccepted);

    await user.click(screen.getByRole('button', { name: 'Beta Co' }));
    expect(await screen.findByRole('button', { name: /Beta Co Lead/ })).toBeInTheDocument();

    await act(async () => {
      alphaMutation.resolve({ ...detailFor('Alpha Co', 'lead-a'), status: 'ACCEPTED' });
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Beta Co Lead/ })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /Alpha Co Lead/ })).not.toBeInTheDocument();
  });
});
