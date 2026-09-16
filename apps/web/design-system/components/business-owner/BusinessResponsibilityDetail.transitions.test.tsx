import { render, screen, within } from '@testing-library/react';
import {
  getBusinessResponsibilityEvidence,
  type BusinessResponsibilityEvidenceReceipt,
  type ResponsibilityStatus,
} from '../../../lib/api/business-responsibilities';
import { useSession } from '../../../state';
import { BusinessResponsibilityDetail } from './BusinessResponsibilityDetail';

jest.mock('../../../state', () => ({ useSession: jest.fn() }));
jest.mock('../../../lib/api/business-responsibilities', () => ({
  getBusinessResponsibilityEvidence: jest.fn(),
  markBusinessResponsibilityNeedsYou: jest.fn(),
  resumeBusinessResponsibility: jest.fn(),
  confirmBusinessResponsibilityCompletion: jest.fn(),
  cancelBusinessResponsibility: jest.fn(),
}));

const mockSession = useSession as jest.Mock;
const mockEvidence = getBusinessResponsibilityEvidence as jest.MockedFunction<
  typeof getBusinessResponsibilityEvidence
>;

const managerCapabilities = {
  canChangeWorkState: true,
  canManageCompletion: true,
};

function receipt(status: ResponsibilityStatus): BusinessResponsibilityEvidenceReceipt {
  return {
    responsibilityId: 'resp-1',
    organizationId: 'org-1',
    objective: 'Carry this business responsibility',
    promise: 'Aureus will carry it.',
    criterion: 'The stated outcome is reached.',
    status,
    dueAt: null,
    completedAt: status === 'COMPLETED' ? '2026-09-16T00:00:00.000Z' : null,
    evidenceSummary: 'No completion evidence has been recorded yet.',
    lifecycle: [],
  };
}

async function renderStatus(status: ResponsibilityStatus) {
  mockEvidence.mockResolvedValue(receipt(status));
  render(
    <BusinessResponsibilityDetail
      organizationId="org-1"
      responsibilityId="resp-1"
      capabilities={managerCapabilities}
      onClose={jest.fn()}
      onChanged={jest.fn()}
    />,
  );
  return screen.findByRole('complementary', { name: /carry this business responsibility/i });
}

describe('BusinessResponsibilityDetail canonical transition affordances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockReturnValue({ session: { accessToken: 'token' } });
  });

  it('offers ACTIVE transitions the Step 3 server permits', async () => {
    const detail = await renderStatus('ACTIVE');

    expect(within(detail).getByRole('button', { name: /flag as needing/i })).toBeInTheDocument();
    expect(within(detail).getByRole('button', { name: /confirm this is done/i })).toBeInTheDocument();
    expect(within(detail).getByRole('button', { name: /cancel this work/i })).toBeInTheDocument();
    expect(within(detail).queryByRole('button', { name: /hand back to aureus/i })).toBeNull();
  });

  it('offers WAITING_ON_USER transitions the Step 3 server permits', async () => {
    const detail = await renderStatus('WAITING_ON_USER');

    expect(within(detail).getByRole('button', { name: /hand back to aureus/i })).toBeInTheDocument();
    expect(within(detail).getByRole('button', { name: /confirm this is done/i })).toBeInTheDocument();
    expect(within(detail).getByRole('button', { name: /cancel this work/i })).toBeInTheDocument();
    expect(within(detail).queryByRole('button', { name: /flag as needing/i })).toBeNull();
  });

  it.each(['WAITING_ON_AUREUS', 'WAITING_ON_THIRD_PARTY', 'BLOCKED'] as ResponsibilityStatus[])(
    'does not offer server-rejected state/completion transitions from %s',
    async (status) => {
      const detail = await renderStatus(status);

      expect(within(detail).queryByRole('button', { name: /flag as needing/i })).toBeNull();
      expect(within(detail).queryByRole('button', { name: /hand back to aureus/i })).toBeNull();
      expect(within(detail).queryByRole('button', { name: /confirm this is done/i })).toBeNull();
      expect(within(detail).getByRole('button', { name: /cancel this work/i })).toBeInTheDocument();
    },
  );

  it.each(['COMPLETED', 'RESPONSIBLY_EXHAUSTED', 'CANCELLED'] as ResponsibilityStatus[])(
    'offers no lifecycle mutation controls for terminal %s work',
    async (status) => {
      const detail = await renderStatus(status);

      expect(within(detail).queryByRole('button', { name: /flag as needing/i })).toBeNull();
      expect(within(detail).queryByRole('button', { name: /hand back to aureus/i })).toBeNull();
      expect(within(detail).queryByRole('button', { name: /confirm this is done/i })).toBeNull();
      expect(within(detail).queryByRole('button', { name: /cancel this work/i })).toBeNull();
    },
  );
});
