import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getBusinessLead,
  getBusinessOperationsSummary,
  listBusinessLeads,
} from '../../../lib/api/business-operations';
import { listMyBusinessTenants } from '../../../lib/api/business-console';
import { useSession } from '../../../state';
import { BusinessOperationsPanel } from './BusinessOperationsPanel';

jest.mock('../../../state', () => ({ useSession: jest.fn() }));
jest.mock('../../../lib/api/business-console', () => ({
  listMyBusinessTenants: jest.fn(),
}));
jest.mock('../../../lib/api/business-operations', () => ({
  assignBusinessLead: jest.fn(),
  exportBusinessOperations: jest.fn(),
  getBusinessLead: jest.fn(),
  getBusinessOperationsSummary: jest.fn(),
  listBusinessLeads: jest.fn(),
  transitionBusinessLead: jest.fn(),
}));

const mockSession = useSession as jest.Mock;
const mockTenants = listMyBusinessTenants as jest.MockedFunction<
  typeof listMyBusinessTenants
>;
const mockSummary = getBusinessOperationsSummary as jest.MockedFunction<
  typeof getBusinessOperationsSummary
>;
const mockLeads = listBusinessLeads as jest.MockedFunction<
  typeof listBusinessLeads
>;
const mockLead = getBusinessLead as jest.MockedFunction<
  typeof getBusinessLead
>;

const summary = {
  generatedAt: '2026-09-02T00:00:00.000Z',
  pipeline: {
    total: 1,
    counts: {
      SUBMITTED: 1,
      ACCEPTED: 0,
      CONTACTED: 0,
      CLOSED: 0,
      LOST: 0,
    },
    awaitingNotification: 0,
    oldestOpenSubmittedAt: '2026-09-02T00:00:00.000Z',
  },
  routing: {
    publicStatus: 'PUBLISHED',
    businessHours: {},
    contactRoutes: [],
    escalationTarget: null,
    fallbackRule: 'Use the configured human route.',
    updatedAt: '2026-09-02T00:00:00.000Z',
  },
  knowledge: {
    total: 0,
    currentApproved: 0,
    dueOrReviewing: 0,
    queue: [],
  },
  provider: {
    basis: 'Observed tenant traffic only.',
    windowStartedAt: '2026-09-01T00:00:00.000Z',
    status: 'NO_TRAFFIC' as const,
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
    {
      userId: 'owner-1',
      role: 'OWNER',
      email: 'owner@example.com',
      displayName: 'Owner',
    },
  ],
};

const leadSummary = {
  id: 'lead-1',
  displayName: 'Jordan',
  contactMethod: 'EMAIL',
  contactValue: 'jordan@example.com',
  projectSummary: 'Open the kitchen layout.',
  projectLocation: 'Philadelphia',
  desiredTiming: 'ONE_TO_THREE_MONTHS',
  qualificationSignals: [],
  status: 'SUBMITTED' as const,
  assignedToId: 'owner-1',
  submittedAt: '2026-09-02T00:00:00.000Z',
  lastStateChangedAt: '2026-09-02T00:00:00.000Z',
  retentionExpiresAt: '2026-12-01T00:00:00.000Z',
  assignmentNotifiedAt: '2026-09-02T00:00:01.000Z',
  assignee: {
    user: {
      id: 'owner-1',
      email: 'owner@example.com',
      profile: { displayName: 'Owner' },
    },
  },
};

const detail = {
  ...leadSummary,
  outcomeReason: null,
  readyProject: {
    contractVersion: 'or003-ready-project-v1' as const,
    leadId: 'lead-1',
    vertical: 'KITCHEN_BATH' as const,
    readinessStatus: 'READY_FOR_EXPERT_REVIEW' as const,
    customerIntent: {
      projectType: 'KITCHEN',
      rooms: ['Kitchen'],
      scope: 'Open the kitchen layout.',
      priorities: ['FUNCTION_AND_LAYOUT'],
      mustHaves: null,
      concerns: null,
    },
    constraints: {
      projectLocation: 'Philadelphia',
      desiredTiming: 'ONE_TO_THREE_MONTHS',
      decisionStatus: null,
      budgetRange: null,
      designNeeds: null,
      attachments: [],
    },
    source: {
      basis: 'CONSENTED_WARD_HANDOFF' as const,
      consentVersion: 'lead-handoff-v1',
      intakeIntegrity: 'SYSTEM_HASH_PRESENT' as const,
      conversationTurns: 2,
      submittedAt: '2026-09-02T00:00:00.000Z',
      retentionExpiresAt: '2026-12-01T00:00:00.000Z',
      modelInferencesIncluded: false as const,
    },
    transactionBarriers: [
      {
        key: 'FIT' as const,
        status: 'EXPERT_REQUIRED' as const,
        basis: 'Physical measurements require expert review.',
      },
    ],
    expertValidationRequired: ['Confirm physical measurements and site conditions.'],
    boundaries: ['This is not a quote or appointment.'],
    missingRequiredSource: [],
  },
  events: [],
  conversation: {
    id: 'conversation-1',
    status: 'ESCALATED',
    turnCount: 2,
    createdAt: '2026-09-02T00:00:00.000Z',
    messages: [
      {
        id: 'message-1',
        role: 'VISITOR' as const,
        content: 'I want a better kitchen layout.',
        responseKind: null,
        createdAt: '2026-09-02T00:00:00.000Z',
        sources: [],
      },
    ],
  },
};

describe('BusinessOperationsPanel Ready Project', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockReturnValue({ session: { accessToken: 'token' } });
    mockTenants.mockResolvedValue([
      {
        id: 'tenant-1',
        organizationRef: 'AUR-ORG-000001',
        name: 'Example Kitchens',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        businessProfile: {
          publicStatus: 'PUBLISHED',
          onboardingStep: 4,
        },
      },
    ]);
    mockSummary.mockResolvedValue(summary);
    mockLeads.mockResolvedValue([leadSummary]);
    mockLead.mockResolvedValue(detail);
  });

  it('puts the distilled Ready Project before the raw source conversation', async () => {
    render(<BusinessOperationsPanel />);
    const user = userEvent.setup();

    const leadButton = await screen.findByRole('button', { name: /Jordan/i });
    await user.click(leadButton);

    const readyHeading = await screen.findByRole('heading', {
      name: 'Ready Project',
    });
    const sourceHeading = screen.getByRole('heading', {
      name: 'Source conversation evidence',
    });

    expect(
      readyHeading.compareDocumentPosition(sourceHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByText(/Aureus distilled the project for expert review/i),
    ).toBeInTheDocument();
    expect(screen.getByText('I want a better kitchen layout.')).toBeInTheDocument();

    await waitFor(() =>
      expect(mockLead).toHaveBeenCalledWith('token', 'tenant-1', 'lead-1'),
    );
  });
});
