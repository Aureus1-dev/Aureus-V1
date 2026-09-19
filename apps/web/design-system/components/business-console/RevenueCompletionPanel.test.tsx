import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  recordRevenueMilestone,
  type RevenueCompletionProjection,
} from '../../../lib/api/business-operations';
import { RevenueCompletionPanel } from './RevenueCompletionPanel';

jest.mock('../../../lib/api/business-operations', () => ({
  recordRevenueMilestone: jest.fn(),
}));

const mockRecord = recordRevenueMilestone as jest.MockedFunction<typeof recordRevenueMilestone>;

function projection(
  overrides: Partial<RevenueCompletionProjection> = {},
): RevenueCompletionProjection {
  return {
    contractVersion: 'or004-revenue-completion-v1',
    responsibilityId: 'resp-1',
    responsibilityStatus: 'ACTIVE',
    currentStage: 'PROPOSAL_RECORDED',
    leadStatus: 'CONTACTED',
    milestones: [
      {
        eventId: 'event-1',
        stage: 'PROPOSAL_RECORDED',
        evidenceReference: 'proposal-1042',
        decision: null,
        evidenceLevel: 'REPORTED',
        reportedByUserId: 'user-1',
        requestKey: '11111111-1111-4111-8111-111111111111',
        occurredAt: '2026-09-16T00:00:00.000Z',
      },
    ],
    latestDecision: null,
    availableActions: ['FOLLOW_UP_RECORDED', 'DECISION_RECORDED'],
    nextRequiredAction: 'Follow up as needed, then record the customer’s reported decision.',
    evidenceNotice:
      'Revenue milestones here are business-reported evidence. Aureus has not independently verified proposals, decisions, contracts, deposits, or operations handoffs.',
    economicStewardship: {
      earn: { status: 'UNKNOWN', basis: 'Proposal value is not ingested.' },
      convert: {
        status: 'REPORTED',
        stage: 'PROPOSAL_RECORDED',
        leadStatus: 'CONTACTED',
        basis: 'Reported milestone plus canonical lead state.',
      },
      keep: { status: 'UNKNOWN', basis: 'Margin is not established.' },
      compound: { status: 'UNKNOWN', basis: 'No repeat/referral source exists.' },
    },
    ...overrides,
  };
}

describe('RevenueCompletionPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecord.mockResolvedValue(projection());
    jest.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '22222222-2222-4222-8222-222222222222',
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('labels milestones as reported and keeps unsupported economics explicitly unknown', () => {
    render(
      <RevenueCompletionPanel
        accessToken="token"
        tenantId="tenant-1"
        leadId="lead-1"
        projection={projection()}
        onChanged={jest.fn()}
      />,
    );

    expect(screen.getByText(/PROPOSAL RECORDED · REPORTED/i)).toBeInTheDocument();
    expect(screen.getByText(/not independently verified/i)).toBeInTheDocument();
    expect(screen.getByText(/Earn · proposal value not ingested/i)).toBeInTheDocument();
    expect(screen.getByText(/Keep · margin not established/i)).toBeInTheDocument();
    expect(screen.getByText(/Compound · no repeat\/referral source/i)).toBeInTheDocument();
    expect(screen.queryByText(/verified payment/i)).not.toBeInTheDocument();
  });

  it('offers only actions returned by the server projection', () => {
    render(
      <RevenueCompletionPanel
        accessToken="token"
        tenantId="tenant-1"
        leadId="lead-1"
        projection={projection({ availableActions: ['FOLLOW_UP_RECORDED'] })}
        onChanged={jest.fn()}
      />,
    );

    expect(screen.getByRole('option', { name: 'Record follow-up' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Record contract boundary' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Record operations handoff' })).toBeNull();
  });

  it('records the selected reported decision with an opaque reference and UUID', async () => {
    const onChanged = jest.fn().mockResolvedValue(undefined);
    render(
      <RevenueCompletionPanel
        accessToken="token"
        tenantId="tenant-1"
        leadId="lead-1"
        projection={projection({ availableActions: ['DECISION_RECORDED'] })}
        onChanged={onChanged}
      />,
    );

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText(/Reported customer decision/i), 'DECLINED');
    await user.type(screen.getByLabelText(/Evidence reference/i), 'decision-crm-42');
    await user.click(screen.getByRole('button', { name: 'Record customer decision' }));

    await waitFor(() =>
      expect(mockRecord).toHaveBeenCalledWith('token', 'tenant-1', 'lead-1', {
        stage: 'DECISION_RECORDED',
        requestKey: '22222222-2222-4222-8222-222222222222',
        evidenceReference: 'decision-crm-42',
        decision: 'DECLINED',
      }),
    );
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('states uncertainty after a failed mutation rather than claiming non-commit', async () => {
    mockRecord.mockRejectedValueOnce(new Error('connection lost'));
    render(
      <RevenueCompletionPanel
        accessToken="token"
        tenantId="tenant-1"
        leadId="lead-1"
        projection={projection({ availableActions: ['FOLLOW_UP_RECORDED'] })}
        onChanged={jest.fn()}
      />,
    );

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Evidence reference/i), 'followup-17');
    await user.click(screen.getByRole('button', { name: 'Record follow-up' }));

    expect(
      await screen.findByText(/could not confirm whether that revenue update completed/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/nothing changed/i)).toBeNull();
  });
});
