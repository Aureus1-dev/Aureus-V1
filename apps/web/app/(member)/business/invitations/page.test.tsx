import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { useBusiness } from '../../../../state';
import BusinessInvitationsPage from './page';

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('../../../../state', () => ({ useBusiness: jest.fn() }));

const mockRouter = useRouter as jest.Mock;
const mockUseBusiness = useBusiness as jest.Mock;

const baseState = { tenants: [], activeTenantId: null, invitations: [], isLoading: false, updatingInvitationId: null, error: null };

describe('BusinessInvitationsPage', () => {
  it('shows an empty state with no pending invitations', () => {
    mockRouter.mockReturnValue({ push: jest.fn() });
    mockUseBusiness.mockReturnValue({
      state: baseState, acceptInvitation: jest.fn(), declineInvitation: jest.fn(),
    });

    render(<BusinessInvitationsPage />);

    expect(screen.getByText(/no pending invitations/i)).toBeInTheDocument();
  });

  it('accepting an invitation navigates to /business', async () => {
    const push = jest.fn();
    const acceptInvitation = jest.fn().mockResolvedValue(undefined);
    mockRouter.mockReturnValue({ push });
    mockUseBusiness.mockReturnValue({
      state: {
        ...baseState,
        invitations: [{
          id: 'inv-1', organizationId: 'org-1', invitedEmail: 'me@example.com', role: 'MEMBER',
          status: 'PENDING', organizationName: 'ABC Kitchen & Bath',
        }],
      },
      acceptInvitation,
      declineInvitation: jest.fn(),
    });

    render(<BusinessInvitationsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));

    expect(acceptInvitation).toHaveBeenCalledWith('inv-1');
    expect(push).toHaveBeenCalledWith('/business');
  });

  it('declining an invitation stays on the page', async () => {
    const push = jest.fn();
    const declineInvitation = jest.fn().mockResolvedValue(undefined);
    mockRouter.mockReturnValue({ push });
    mockUseBusiness.mockReturnValue({
      state: {
        ...baseState,
        invitations: [{
          id: 'inv-1', organizationId: 'org-1', invitedEmail: 'me@example.com', role: 'MEMBER',
          status: 'PENDING', organizationName: 'ABC Kitchen & Bath',
        }],
      },
      acceptInvitation: jest.fn(),
      declineInvitation,
    });

    render(<BusinessInvitationsPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));

    expect(declineInvitation).toHaveBeenCalledWith('inv-1');
    expect(push).not.toHaveBeenCalled();
  });
});
