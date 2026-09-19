import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getBusinessLead,
  getBusinessOperationsSummary,
  listBusinessLeads,
  type BusinessLeadDetail,
  type BusinessLeadSummary,
  type BusinessOperationsSummary,
} from '../../../lib/api/business-operations';
import { useBusiness, useSession } from '../../../state';
import { BusinessOperationsPanel } from './BusinessOperationsPanel';

jest.mock('../../../state', () => ({ useSession: jest.fn(), useBusiness: jest.fn() }));
jest.mock('../../../lib/api/business-operations', () => ({
  assignBusinessLead: jest.fn(),
  exportBusinessOperations: jest.fn(),
  getBusinessLead: jest.fn(),
  getBusinessOperationsSummary: jest.fn(),
  listBusinessLeads: jest.fn(),
  recordRevenueMilestone: jest.fn(),
  transitionBusinessLead: jest.fn(),
}));

const mockSession = useSession as jest.Mock;
const mockBusiness = useBusiness as jest.Mock;
const mockSummary = getBusinessOperationsSummary as jest.MockedFunction<
  typeof getBusinessOperationsSummary
>;
const mockLeads = listBusinessLeads as jest.MockedFunction<typeof listBusinessLeads>;
const mockLead = getBusinessLead as jest.MockedFunction<typeof getBusinessLead>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function tenant(id: string, name: string) {
  mockBusiness.mockReturnValue({
    activeTenant: { id, name },
    state: { isLoading: false },
  });
}

function summary(name: string): BusinessOperationsSummary {
  return {
    generatedAt: '2026-09-16T00:00:00.000Z',
    pipeline: {
      total: 1,
      counts: { SUBMITTED: 0, ACCEPTED: 0, CONTACTED: 1, CLOSED: 0, LOST: 0 },
      awaitingNotification: 0,
      oldestOpenSubmittedAt: '2026-09-16T00:00:00.000Z',
    },
    routing: {
      publicStatus: 'PUBLISHED',
      businessHours: {},
      contactRoutes: [],
      escalationTarget: null,
      fallbackRule: `${name} fallback`,
      updatedAt: null,
    },
    knowledge: { total: 0, currentApproved: 0, dueOrReviewing: 0, queue: [] },
    provider: {
      basis: `${name} provider evidence`,
      windowStartedAt: '2026-09-15T00:00:00.000Z',
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
    owners: [{ userId: `${name}-owner`, role: 'OWNER', email: `${name}@example.com`, displayName: name }],
  };
}

function lead(name: string, id: string): BusinessLeadSummary {
  return {
    id,
    displayName: `${name} Lead`,
    contactMethod: 'EMAIL',
    contactValue: `${name.toLowerCase()}@example.com`,
    projectSummary: `${name} kitchen project`,
    projectLocation: 'Philadelphia',
    desiredTiming: 'ONE_TO_THREE_MONTHS',
    qualificationSignals: [],
    status: 'CONTACTED',
    assignedToId: `${name}-owner`,
    submittedAt: '2026-09-16T00:00:00.000Z',
    lastStateChangedAt: '2026-09-16T00:00:00.000Z',
    retentionExpiresAt: '2026-12-15T00:00:00.000Z',
    assignmentNotifiedAt: null,
    assignee: {
      user: {
        id: `${name}-owner`,
        email: `${name}@example.com`,
        profile: { displayName: name },
      },
    },
  };
}

function alphaDetail(): BusinessLeadDetail {
  return {
    ...lead('Alpha', 'lead-a'),
    outcomeReason: null,
    readyProject: null,
    revenueCompletion: {
      contractVersion: 'or004-revenue-completion-v1',
      responsibilityId: 'alpha-revenue-responsibility',
      responsibilityStatus: 'ACTIVE',
      currentStage: 'PROPOSAL_RECORDED',
      leadStatus: 'CONTACTED',
      milestones: [
        {
          eventId: 'alpha-event',
          stage: 'PROPOSAL_RECORDED',
          evidenceReference: 'ALPHA-PRIVATE-PROPOSAL-99',
          decision: null,
          evidenceLevel: 'REPORTED',
          reportedByUserId: 'alpha-user',
          requestKey: '11111111-1111-4111-8111-111111111111',
          occurredAt: '2026-09-16T00:00:01.000Z',
        },
      ],
      latestDecision: null,
      availableActions: ['FOLLOW_UP_RECORDED', 'DECISION_RECORDED'],
      nextRequiredAction: 'Record the reported customer decision.',
      evidenceNotice: 'Business-reported evidence. Not independently verified.',
      economicStewardship: {
        earn: { status: 'UNKNOWN', basis: 'Unknown.' },
        convert: {
          status: 'REPORTED',
          stage: 'PROPOSAL_RECORDED',
          leadStatus: 'CONTACTED',
          basis: 'Reported.',
        },
        keep: { status: 'UNKNOWN', basis: 'Unknown.' },
        compound: { status: 'UNKNOWN', basis: 'Unknown.' },
      },
    },
    events: [],
    conversation: {
      id: 'alpha-conversation',
      status: 'ESCALATED',
      turnCount: 2,
      createdAt: '2026-09-16T00:00:00.000Z',
      messages: [],
    },
  };
}

describe('BusinessOperationsPanel revenue tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockReturnValue({ session: { accessToken: 'token' } });
    mockSummary.mockImplementation((_token, id) =>
      Promise.resolve(summary(id === 'tenant-a' ? 'Alpha' : 'Beta')),
    );
    mockLeads.mockImplementation((_token, id) =>
      Promise.resolve([lead(id === 'tenant-a' ? 'Alpha' : 'Beta', id === 'tenant-a' ? 'lead-a' : 'lead-b')]),
    );
  });

  it('discards a late prior-tenant detail containing private revenue evidence', async () => {
    const alpha = deferred<BusinessLeadDetail>();
    mockLead.mockImplementation((_token, id) => {
      if (id === 'tenant-a') return alpha.promise;
      return Promise.resolve({
        ...lead('Beta', 'lead-b'),
        outcomeReason: null,
        readyProject: null,
        revenueCompletion: null,
        events: [],
        conversation: {
          id: 'beta-conversation',
          status: 'ESCALATED',
          turnCount: 1,
          createdAt: '2026-09-16T00:00:00.000Z',
          messages: [],
        },
      });
    });

    tenant('tenant-a', 'Alpha Co');
    const { rerender } = render(<BusinessOperationsPanel />);
    const user = userEvent.setup();

    const alphaLead = await screen.findByRole('button', { name: /Alpha Lead/i });
    await user.click(alphaLead);
    await waitFor(() => expect(mockLead).toHaveBeenCalledWith('token', 'tenant-a', 'lead-a'));

    tenant('tenant-b', 'Beta Co');
    rerender(<BusinessOperationsPanel />);

    expect(screen.queryByText(/ALPHA-PRIVATE-PROPOSAL-99/i)).toBeNull();
    expect(await screen.findByRole('button', { name: /Beta Lead/i })).toBeInTheDocument();

    await act(async () => {
      alpha.resolve(alphaDetail());
      await alpha.promise;
      await Promise.resolve();
    });

    expect(screen.getByRole('button', { name: /Beta Lead/i })).toBeInTheDocument();
    expect(screen.queryByText(/ALPHA-PRIVATE-PROPOSAL-99/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Record customer decision/i })).toBeNull();
  });
});
