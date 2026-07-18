import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { FounderProvider } from '../../../state/founder/FounderContext';
import { UserRoleManagementPanel } from './UserRoleManagementPanel';

import * as usersApi from '../../../lib/api/users';
import type { UserDto } from '../../../lib/api/users';

jest.mock('../../../lib/api/founder-metrics');
jest.mock('../../../lib/api/ai-operational-config');
jest.mock('../../../lib/api/ai-requests');
jest.mock('../../../lib/api/users');

const mockedUsersApi = usersApi as jest.Mocked<typeof usersApi>;

const NOW = '2026-01-01T00:00:00Z';

function makeUser(o: Partial<UserDto> = {}): UserDto {
  return {
    id: 'user-1', email: 'member@example.com', emailVerified: true, roles: ['MEMBER'], status: 'ACTIVE',
    createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
  };
}

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'admin-1', email: 'admin@example.com' });
  }
  return <>{children}</>;
}

function renderPanel() {
  return render(
    <SessionProvider>
      <FounderProvider>
        <SignedInAs>
          <UserRoleManagementPanel />
        </SignedInAs>
      </FounderProvider>
    </SessionProvider>,
  );
}

describe('UserRoleManagementPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists members with their current roles and status', async () => {
    mockedUsersApi.listUsers.mockResolvedValue({ data: [makeUser()], total: 1, page: 1, limit: 50, totalPages: 1 });
    renderPanel();

    expect(await screen.findByText('member@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke MEMBER from member@example.com' })).toBeInTheDocument();
    expect(screen.getByText('1 members')).toBeInTheDocument();
  });

  it('grants a role to a member', async () => {
    mockedUsersApi.listUsers.mockResolvedValue({ data: [makeUser()], total: 1, page: 1, limit: 50, totalPages: 1 });
    mockedUsersApi.grantRole.mockResolvedValue(makeUser({ roles: ['MEMBER', 'STEWARD'] }));
    const user = userEvent.setup();

    renderPanel();
    await screen.findByText('member@example.com');

    await user.selectOptions(screen.getByLabelText('Grant a role to member@example.com'), 'STEWARD');
    await user.click(screen.getByRole('button', { name: 'Grant' }));

    await waitFor(() => expect(mockedUsersApi.grantRole).toHaveBeenCalledWith('token-123', 'user-1', 'STEWARD'));
    expect(await screen.findByRole('button', { name: 'Revoke STEWARD from member@example.com' })).toBeInTheDocument();
  });

  it('revokes a role from a member with more than one role', async () => {
    mockedUsersApi.listUsers.mockResolvedValue({
      data: [makeUser({ roles: ['MEMBER', 'STEWARD'] })], total: 1, page: 1, limit: 50, totalPages: 1,
    });
    mockedUsersApi.revokeRole.mockResolvedValue(makeUser({ roles: ['MEMBER'] }));

    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('member@example.com');

    await user.click(screen.getByRole('button', { name: 'Revoke STEWARD from member@example.com' }));

    await waitFor(() => expect(mockedUsersApi.revokeRole).toHaveBeenCalledWith('token-123', 'user-1', 'STEWARD'));
  });

  it('disables revoking a member\'s last remaining role', async () => {
    mockedUsersApi.listUsers.mockResolvedValue({ data: [makeUser({ roles: ['MEMBER'] })], total: 1, page: 1, limit: 50, totalPages: 1 });
    renderPanel();
    await screen.findByText('member@example.com');

    expect(screen.getByRole('button', { name: 'Revoke MEMBER from member@example.com' })).toBeDisabled();
  });

  it('changes a member\'s status', async () => {
    mockedUsersApi.listUsers.mockResolvedValue({ data: [makeUser()], total: 1, page: 1, limit: 50, totalPages: 1 });
    mockedUsersApi.updateUser.mockResolvedValue(makeUser({ status: 'SUSPENDED' }));
    const user = userEvent.setup();

    renderPanel();
    await screen.findByText('member@example.com');

    await user.selectOptions(screen.getByLabelText('Status for member@example.com'), 'SUSPENDED');

    await waitFor(() =>
      expect(mockedUsersApi.updateUser).toHaveBeenCalledWith('token-123', 'user-1', { status: 'SUSPENDED' }),
    );
  });

  it('shows an empty state when no members match the filter', async () => {
    mockedUsersApi.listUsers.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50, totalPages: 0 });
    renderPanel();
    expect(await screen.findByText('No members match')).toBeInTheDocument();
  });

  it('has no accessibility violations once loaded', async () => {
    mockedUsersApi.listUsers.mockResolvedValue({
      data: [makeUser({ roles: ['MEMBER', 'STEWARD'] })], total: 1, page: 1, limit: 50, totalPages: 1,
    });
    const { container } = renderPanel();
    await screen.findByText('member@example.com');
    expect(await axe(container)).toHaveNoViolations();
  });
});
