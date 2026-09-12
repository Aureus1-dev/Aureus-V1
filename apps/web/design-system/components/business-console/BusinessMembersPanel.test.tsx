import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getBusinessConsole } from '../../../lib/api/business-console';
import {
  inviteMember,
  listInvitations,
  listMembers,
  removeMember,
  revokeInvitation,
  transferOwnership,
  updateMemberRole,
} from '../../../lib/api/organizations';
import { useBusiness, useSession } from '../../../state';
import { BusinessMembersPanel } from './BusinessMembersPanel';

jest.mock('../../../state', () => ({ useSession: jest.fn(), useBusiness: jest.fn() }));
jest.mock('../../../lib/api/business-console', () => ({ getBusinessConsole: jest.fn() }));
jest.mock('../../../lib/api/organizations', () => ({
  inviteMember: jest.fn(),
  listInvitations: jest.fn(),
  listMembers: jest.fn(),
  removeMember: jest.fn(),
  revokeInvitation: jest.fn(),
  transferOwnership: jest.fn(),
  updateMemberRole: jest.fn(),
}));

const mockSession = useSession as jest.Mock;
const mockBusiness = useBusiness as jest.Mock;
const mockConsole = getBusinessConsole as jest.MockedFunction<typeof getBusinessConsole>;
const mockListMembers = listMembers as jest.MockedFunction<typeof listMembers>;
const mockListInvitations = listInvitations as jest.MockedFunction<typeof listInvitations>;
const mockInvite = inviteMember as jest.MockedFunction<typeof inviteMember>;
const mockRevoke = revokeInvitation as jest.MockedFunction<typeof revokeInvitation>;
const mockRemove = removeMember as jest.MockedFunction<typeof removeMember>;
const mockTransfer = transferOwnership as jest.MockedFunction<typeof transferOwnership>;

const activeTenant = { id: 'org-1', name: 'ABC Kitchen & Bath' };

function setup(
  consoleOverrides: Partial<Parameters<typeof mockConsole.mockResolvedValue>[0]> = {},
) {
  mockSession.mockReturnValue({ session: { accessToken: 'token-123', memberId: 'owner-1' } });
  mockBusiness.mockReturnValue({ activeTenant });
  mockConsole.mockResolvedValue({
    tenantId: 'org-1',
    tenantVersion: 1,
    organization: { id: 'org-1', name: 'ABC Kitchen & Bath' } as never,
    profile: null,
    membershipRole: 'OWNER',
    canManage: true,
    ...consoleOverrides,
  });
  mockListMembers.mockResolvedValue([
    {
      id: 'm-1',
      organizationId: 'org-1',
      userId: 'owner-1',
      role: 'OWNER',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'm-2',
      organizationId: 'org-1',
      userId: 'employee-1',
      role: 'MEMBER',
      createdAt: '',
      updatedAt: '',
    },
  ]);
  mockListInvitations.mockResolvedValue([]);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BusinessMembersPanel', () => {
  it('lists current members with their roles', async () => {
    setup();
    render(<BusinessMembersPanel />);

    expect(await screen.findByText('owner-1')).toBeInTheDocument();
    expect(screen.getAllByText('employee-1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('OWNER')).not.toHaveLength(0);
  });

  it('keeps ownership out of generic role editing', async () => {
    setup();
    render(<BusinessMembersPanel />);
    await screen.findByText('owner-1');

    expect(screen.queryByLabelText('Change role for owner-1')).not.toBeInTheDocument();
    const employeeRole = screen.getByLabelText('Change role for employee-1');
    expect(within(employeeRole).queryByRole('option', { name: 'OWNER' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Transfer ownership/ })).toBeInTheDocument();
  });

  it('lets a manager invite a member by email', async () => {
    setup();
    mockInvite.mockResolvedValue({} as never);
    render(<BusinessMembersPanel />);
    await screen.findByText('owner-1');

    await userEvent.type(screen.getByLabelText('Email'), 'employee@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() =>
      expect(mockInvite).toHaveBeenCalledWith(
        'token-123',
        'org-1',
        'employee@example.com',
        'MEMBER',
      ),
    );
  });

  it('lets a manager revoke a pending invitation', async () => {
    setup();
    mockListInvitations.mockResolvedValue([
      {
        id: 'inv-1',
        organizationId: 'org-1',
        invitedEmail: 'pending@example.com',
        role: 'MEMBER',
        status: 'PENDING',
        invitedById: 'owner-1',
        expiresAt: '',
        acceptedAt: null,
        declinedAt: null,
        revokedAt: null,
        createdAt: '',
      },
    ]);
    mockRevoke.mockResolvedValue(undefined);
    render(<BusinessMembersPanel />);

    await userEvent.click(await screen.findByRole('button', { name: 'Revoke' }));

    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith('token-123', 'org-1', 'inv-1'));
  });

  it('lets a manager remove another member', async () => {
    setup();
    mockRemove.mockResolvedValue(undefined);
    render(<BusinessMembersPanel />);
    await screen.findAllByText('employee-1');

    const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
    await userEvent.click(removeButtons[0]);

    await waitFor(() =>
      expect(mockRemove).toHaveBeenCalledWith('token-123', 'org-1', 'employee-1'),
    );
  });

  it("shows Leave (not Remove) for the caller's own row, even without manager authority", async () => {
    setup({ membershipRole: 'MEMBER', canManage: false });
    mockListMembers.mockResolvedValue([
      {
        id: 'm-1',
        organizationId: 'org-1',
        userId: 'owner-1',
        role: 'MEMBER',
        createdAt: '',
        updatedAt: '',
      },
    ]);
    render(<BusinessMembersPanel />);

    expect(await screen.findByRole('button', { name: 'Leave' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('offers ownership transfer only to the current OWNER', async () => {
    setup();
    render(<BusinessMembersPanel />);
    await screen.findByText('owner-1');
    expect(screen.getByRole('button', { name: /Transfer ownership/ })).toBeInTheDocument();

    mockTransfer.mockResolvedValue({} as never);
    await userEvent.selectOptions(screen.getByLabelText('New owner'), 'employee-1');
    await userEvent.click(screen.getByRole('button', { name: /Transfer ownership/ }));

    await waitFor(() =>
      expect(mockTransfer).toHaveBeenCalledWith('token-123', 'org-1', 'employee-1'),
    );
  });

  it('does not offer ownership transfer to a non-OWNER manager', async () => {
    setup({ membershipRole: 'ADMIN' });
    render(<BusinessMembersPanel />);
    await screen.findByText('owner-1');

    expect(screen.queryByText(/Transfer ownership/)).not.toBeInTheDocument();
  });

  it("lets a manager change a member's role", async () => {
    setup();
    mockUpdateRole().mockResolvedValue({} as never);
    render(<BusinessMembersPanel />);
    await screen.findAllByText('employee-1');

    const roleSelect = screen.getByLabelText('Change role for employee-1');
    await userEvent.selectOptions(roleSelect, 'ADMIN');

    await waitFor(() =>
      expect(updateMemberRole).toHaveBeenCalledWith('token-123', 'org-1', 'employee-1', 'ADMIN'),
    );
  });
});

function mockUpdateRole() {
  return updateMemberRole as jest.MockedFunction<typeof updateMemberRole>;
}
