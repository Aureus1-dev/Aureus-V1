import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getBusinessConsole } from '../../../lib/api/business-console';
import {
  confirmBusinessResponsibilityCompletion,
  getBusinessResponsibilityEvidence,
  listBusinessResponsibilities,
  type BusinessResponsibilityDto,
  type BusinessResponsibilityEvidenceReceipt,
  type ResponsibilityStatus,
} from '../../../lib/api/business-responsibilities';
import { useBusiness, useSession } from '../../../state';
import { BusinessOwnerHome } from './BusinessOwnerHome';

jest.mock('../../../state', () => ({ useSession: jest.fn(), useBusiness: jest.fn() }));
jest.mock('../../../lib/api/business-console', () => ({ getBusinessConsole: jest.fn() }));
jest.mock('../../../lib/api/business-responsibilities', () => ({
  listBusinessResponsibilities: jest.fn(),
  getBusinessResponsibilityEvidence: jest.fn(),
  markBusinessResponsibilityNeedsYou: jest.fn(),
  resumeBusinessResponsibility: jest.fn(),
  confirmBusinessResponsibilityCompletion: jest.fn(),
  cancelBusinessResponsibility: jest.fn(),
}));

const mockSession = useSession as jest.Mock;
const mockBusiness = useBusiness as jest.Mock;
const mockList = listBusinessResponsibilities as jest.MockedFunction<
  typeof listBusinessResponsibilities
>;
const mockEvidence = getBusinessResponsibilityEvidence as jest.MockedFunction<
  typeof getBusinessResponsibilityEvidence
>;
const mockConsole = getBusinessConsole as jest.MockedFunction<typeof getBusinessConsole>;
const mockComplete = confirmBusinessResponsibilityCompletion as jest.MockedFunction<
  typeof confirmBusinessResponsibilityCompletion
>;

function responsibility(
  overrides: Partial<BusinessResponsibilityDto> = {},
): BusinessResponsibilityDto {
  return {
    id: 'resp-1',
    kind: 'BUSINESS_PROMISE',
    objective: 'Answer new customer enquiries within one business day',
    status: 'ACTIVE' as ResponsibilityStatus,
    contextType: 'BUSINESS_TENANT',
    authorityClass: 'GUIDANCE_ONLY',
    authorityPolicyVersion: 'v1',
    privacyScope: 'BUSINESS_PRIVATE',
    privacyPolicyVersion: 'v1',
    originConversationId: null,
    originOpportunityId: null,
    successCriteria: { promise: 'Aureus will draft a reply for every new enquiry.' },
    dueAt: null,
    retentionExpiresAt: null,
    completedAt: null,
    createdAt: '2026-09-13T09:00:00.000Z',
    updatedAt: '2026-09-13T09:00:00.000Z',
    events: [],
    ...overrides,
  };
}

function receipt(
  overrides: Partial<BusinessResponsibilityEvidenceReceipt> = {},
): BusinessResponsibilityEvidenceReceipt {
  return {
    responsibilityId: 'resp-1',
    organizationId: 'org-1',
    objective: 'Answer new customer enquiries within one business day',
    promise: 'Aureus will draft a reply for every new enquiry.',
    criterion: 'Every enquiry has a reply drafted.',
    status: 'ACTIVE',
    dueAt: null,
    completedAt: null,
    evidenceSummary: 'No completion evidence has been recorded yet.',
    lifecycle: [],
    ...overrides,
  };
}

const MANAGER_ATTESTATION: BusinessResponsibilityEvidenceReceipt['lifecycle'] = [
  {
    eventId: 'event-1',
    type: 'ACTION_EVIDENCED',
    actorClass: 'SYSTEM',
    actorUserId: null,
    occurredAt: '2026-09-13T10:00:00.000Z',
    fromStatus: null,
    toStatus: null,
    sourceSystem: 'AUREUS_BUSINESS',
    sourceRecordType: 'OrganizationMemberAttestation',
    sourceRecordId: 'user-1',
    sourceState: 'MANAGER_CONFIRMED',
    evidenceLevel: 'REPORTED',
  },
];

function setTenant(tenant: { id: string; name: string } | null) {
  mockBusiness.mockReturnValue({
    activeTenant: tenant ? { id: tenant.id, name: tenant.name } : null,
    state: { isLoading: false, tenants: tenant ? [tenant] : [], invitations: [] },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.mockReturnValue({ session: { accessToken: 'token' } });
  setTenant({ id: 'org-1', name: 'Northside Remodeling' });
  mockConsole.mockResolvedValue({ membershipRole: 'OWNER' } as never);
  mockList.mockResolvedValue([]);
  mockEvidence.mockResolvedValue(receipt());
});

describe('what the owner sees first', () => {
  it('shows work waiting on the business under Needs you', async () => {
    mockList.mockResolvedValue([
      responsibility({ id: 'a', status: 'WAITING_ON_USER', objective: 'Approve the quote' }),
      responsibility({ id: 'b', status: 'ACTIVE', objective: 'Draft enquiry replies' }),
    ]);

    render(<BusinessOwnerHome />);

    const needsYou = await screen.findByRole('region', { name: /needs you/i });
    expect(within(needsYou).getByText('Approve the quote')).toBeInTheDocument();
    expect(within(needsYou).queryByText('Draft enquiry replies')).not.toBeInTheDocument();
  });

  it('shows active work as work Aureus is carrying', async () => {
    mockList.mockResolvedValue([responsibility({ status: 'ACTIVE' })]);

    render(<BusinessOwnerHome />);

    const carrying = await screen.findByRole('region', { name: /aureus is carrying/i });
    expect(
      within(carrying).getByText('Answer new customer enquiries within one business day'),
    ).toBeInTheDocument();
    expect(within(carrying).getByText('Aureus is carrying this')).toBeInTheDocument();
  });

  it('requests only the selected organization', async () => {
    render(<BusinessOwnerHome />);
    await waitFor(() => expect(mockList).toHaveBeenCalledWith('token', 'org-1'));
  });
});

describe('empty states are truthful', () => {
  it('says nothing needs the owner when nothing does', async () => {
    mockList.mockResolvedValue([responsibility({ status: 'ACTIVE' })]);
    render(<BusinessOwnerHome />);

    expect(
      await screen.findByText('Aureus doesn’t need anything from you right now.'),
    ).toBeInTheDocument();
  });

  it('says no work is being carried rather than inventing rows', async () => {
    mockList.mockResolvedValue([]);
    render(<BusinessOwnerHome />);

    expect(
      await screen.findByText('No active work is being carried for this business yet.'),
    ).toBeInTheDocument();
  });
});

describe('failure never fabricates state', () => {
  it('shows a bounded failure and no responsibility rows', async () => {
    mockList.mockRejectedValue(new Error('backend down'));
    render(<BusinessOwnerHome />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not load/i);
    expect(screen.queryByRole('region', { name: /needs you/i })).not.toBeInTheDocument();
  });
});

describe('tenant boundary', () => {
  it('does not render Organization A data after switching to Organization B', async () => {
    mockList.mockResolvedValueOnce([
      responsibility({ id: 'a', objective: 'Org A only work', status: 'ACTIVE' }),
    ]);
    const { rerender } = render(<BusinessOwnerHome />);
    expect(await screen.findByText('Org A only work')).toBeInTheDocument();

    setTenant({ id: 'org-2', name: 'Second Company' });
    mockList.mockResolvedValueOnce([
      responsibility({ id: 'b', objective: 'Org B only work', status: 'ACTIVE' }),
    ]);
    rerender(<BusinessOwnerHome />);

    expect(await screen.findByText('Org B only work')).toBeInTheDocument();
    expect(screen.queryByText('Org A only work')).not.toBeInTheDocument();
    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith('token', 'org-2'));
  });

  it('shows no business work when the member has no organization', async () => {
    setTenant(null);
    render(<BusinessOwnerHome />);

    expect(await screen.findByText(/not working inside a business yet/i)).toBeInTheDocument();
    expect(mockList).not.toHaveBeenCalled();
  });
});

describe('Trust & Permissions is reused, not duplicated', () => {
  it('links to the canonical Step 2 experience', async () => {
    render(<BusinessOwnerHome />);

    const link = await screen.findByRole('link', { name: /trust & permissions/i });
    expect(link).toHaveAttribute('href', '/permissions');
    // No grant/revoke controls are re-implemented here.
    expect(screen.queryByRole('button', { name: /revoke/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /suspend/i })).not.toBeInTheDocument();
  });
});

describe('administrative capability stays reachable', () => {
  it('offers business settings without making it the first thing shown', async () => {
    render(<BusinessOwnerHome />);
    const link = await screen.findByRole('link', { name: /business settings/i });
    expect(link).toHaveAttribute('href', '/business/admin');
  });
});

describe('completed work language', () => {
  it('never describes a REPORTED completion as verified in the list', async () => {
    mockList.mockResolvedValue([
      responsibility({
        id: 'done',
        status: 'COMPLETED',
        objective: 'Reply to the Harper enquiry',
        completedAt: '2026-09-13T10:00:01.000Z',
        events: MANAGER_ATTESTATION.map((entry) => ({
          id: entry.eventId,
          type: entry.type,
          actorClass: entry.actorClass,
          actorUserId: entry.actorUserId,
          fromStatus: entry.fromStatus,
          toStatus: entry.toStatus,
          sourceSystem: entry.sourceSystem,
          sourceRecordType: entry.sourceRecordType,
          sourceRecordId: entry.sourceRecordId,
          sourceState: entry.sourceState,
          evidenceLevel: entry.evidenceLevel,
          occurredAt: entry.occurredAt,
        })),
      }),
    ]);

    render(<BusinessOwnerHome />);

    const recent = await screen.findByRole('region', { name: /recently completed/i });
    expect(within(recent).getByText('Completed — reported')).toBeInTheDocument();
    expect(within(recent).queryByText(/Completed — verified/)).not.toBeInTheDocument();
  });
});

describe('responsibility detail', () => {
  it('uses the canonical evidence endpoint', async () => {
    mockList.mockResolvedValue([responsibility({ id: 'resp-1', status: 'ACTIVE' })]);
    render(<BusinessOwnerHome />);

    await userEvent.click(
      await screen.findByRole('button', {
        name: /Answer new customer enquiries within one business day/i,
      }),
    );

    await waitFor(() =>
      expect(mockEvidence).toHaveBeenCalledWith('token', 'org-1', 'resp-1'),
    );
    expect(await screen.findByText('Every enquiry has a reply drafted.')).toBeInTheDocument();
  });

  it('states reported completion truthfully and names only what the receipt supports', async () => {
    mockList.mockResolvedValue([responsibility({ id: 'resp-1', status: 'COMPLETED' })]);
    mockEvidence.mockResolvedValue(
      receipt({
        status: 'COMPLETED',
        completedAt: '2026-09-13T10:00:01.000Z',
        lifecycle: MANAGER_ATTESTATION,
      }),
    );

    render(<BusinessOwnerHome />);
    await userEvent.click(
      await screen.findByRole('button', {
        name: /Answer new customer enquiries within one business day/i,
      }),
    );

    const detail = await screen.findByRole('complementary', {
      name: /Answer new customer enquiries/i,
    });
    expect(within(detail).getByText(/Completed — reported/)).toBeInTheDocument();
    expect(within(detail).getByText(/a business manager/)).toBeInTheDocument();
    expect(within(detail).getByText(/has not independently verified/)).toBeInTheDocument();
  });

  it('says evidence is absent rather than implying certainty', async () => {
    mockList.mockResolvedValue([responsibility({ id: 'resp-1', status: 'ACTIVE' })]);
    mockEvidence.mockResolvedValue(receipt({ status: 'ACTIVE', lifecycle: [] }));

    render(<BusinessOwnerHome />);
    await userEvent.click(
      await screen.findByRole('button', {
        name: /Answer new customer enquiries within one business day/i,
      }),
    );

    expect(await screen.findByText('No evidence has been recorded yet.')).toBeInTheDocument();
  });

  it('does not fabricate a record when the evidence endpoint fails', async () => {
    mockList.mockResolvedValue([responsibility({ id: 'resp-1', status: 'ACTIVE' })]);
    mockEvidence.mockRejectedValue(new Error('nope'));

    render(<BusinessOwnerHome />);
    await userEvent.click(
      await screen.findByRole('button', {
        name: /Answer new customer enquiries within one business day/i,
      }),
    );

    expect(await screen.findByText(/could not load the record/i)).toBeInTheDocument();
  });
});

describe('role gating in the detail panel', () => {
  async function openDetailAs(role: string) {
    mockConsole.mockResolvedValue({ membershipRole: role } as never);
    mockList.mockResolvedValue([responsibility({ id: 'resp-1', status: 'ACTIVE' })]);
    render(<BusinessOwnerHome />);
    await userEvent.click(
      await screen.findByRole('button', {
        name: /Answer new customer enquiries within one business day/i,
      }),
    );
    return screen.findByRole('complementary', { name: /Answer new customer enquiries/i });
  }

  it.each(['VIEWER', 'MEMBER'])('%s receives no management controls', async (role) => {
    const detail = await openDetailAs(role);

    expect(within(detail).queryByRole('button', { name: /confirm this is done/i })).toBeNull();
    expect(within(detail).queryByRole('button', { name: /cancel this work/i })).toBeNull();
    expect(within(detail).queryByRole('button', { name: /flag as needing/i })).toBeNull();
  });

  it('OPERATOR may move work but is never offered completion or cancellation', async () => {
    const detail = await openDetailAs('OPERATOR');

    expect(within(detail).getByRole('button', { name: /flag as needing/i })).toBeInTheDocument();
    expect(within(detail).queryByRole('button', { name: /confirm this is done/i })).toBeNull();
    expect(within(detail).queryByRole('button', { name: /cancel this work/i })).toBeNull();
  });

  it('MANAGER may confirm completion through the canonical Step 3 endpoint', async () => {
    mockComplete.mockResolvedValue(responsibility({ id: 'resp-1', status: 'COMPLETED' }));
    const detail = await openDetailAs('MANAGER');

    await userEvent.click(within(detail).getByRole('button', { name: /confirm this is done/i }));

    await waitFor(() => expect(mockComplete).toHaveBeenCalledWith('token', 'org-1', 'resp-1'));
  });

  it('offers nothing when the role cannot be determined', async () => {
    mockConsole.mockRejectedValue(new Error('no console'));
    mockList.mockResolvedValue([responsibility({ id: 'resp-1', status: 'ACTIVE' })]);
    render(<BusinessOwnerHome />);
    await userEvent.click(
      await screen.findByRole('button', {
        name: /Answer new customer enquiries within one business day/i,
      }),
    );

    const detail = await screen.findByRole('complementary', {
      name: /Answer new customer enquiries/i,
    });
    expect(within(detail).queryByRole('button', { name: /confirm this is done/i })).toBeNull();
    expect(within(detail).queryByRole('button', { name: /flag as needing/i })).toBeNull();
  });
});

describe('personal / business firewall', () => {
  it('reads only the business responsibility API', async () => {
    mockList.mockResolvedValue([responsibility({ status: 'ACTIVE' })]);
    render(<BusinessOwnerHome />);
    await screen.findByRole('region', { name: /aureus is carrying/i });

    // Every call this surface makes is organization-scoped; no personal
    // responsibility, goal, conversation or connected-account client is used.
    for (const call of mockList.mock.calls) {
      expect(call[1]).toBe('org-1');
    }
    expect(mockEvidence).not.toHaveBeenCalled();
  });
});
