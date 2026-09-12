import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useBusiness } from '../../../state';
import { BusinessContextSwitcher } from './BusinessContextSwitcher';

jest.mock('../../../state', () => ({ useBusiness: jest.fn() }));

const mockUseBusiness = useBusiness as jest.Mock;

const baseState = {
  tenants: [],
  activeTenantId: null,
  invitations: [],
  isLoading: false,
  updatingInvitationId: null,
  error: null,
};

describe('BusinessContextSwitcher', () => {
  it('renders nothing when the member has no companies and no invitations', () => {
    mockUseBusiness.mockReturnValue({
      state: baseState,
      activeTenant: null,
      selectTenant: jest.fn(),
    });
    const { container } = render(<BusinessContextSwitcher />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists every company the member belongs to and marks the active one unambiguous', () => {
    mockUseBusiness.mockReturnValue({
      state: {
        ...baseState,
        tenants: [
          { id: 'org-1', name: 'ABC Kitchen & Bath' },
          { id: 'org-2', name: 'XYZ Construction' },
        ],
        activeTenantId: 'org-1',
      },
      activeTenant: { id: 'org-1', name: 'ABC Kitchen & Bath' },
      selectTenant: jest.fn(),
    });

    render(<BusinessContextSwitcher />);

    expect(screen.getByRole('link', { name: 'Personal' })).toBeInTheDocument();
    const activeButton = screen.getByRole('button', { name: 'ABC Kitchen & Bath' });
    expect(activeButton).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'XYZ Construction' })).not.toHaveAttribute(
      'aria-current',
    );
    expect(screen.getByText(/working inside/)).toHaveTextContent('ABC Kitchen & Bath');
  });

  it('switches context when a different company is selected', async () => {
    const selectTenant = jest.fn();
    mockUseBusiness.mockReturnValue({
      state: {
        ...baseState,
        tenants: [
          { id: 'org-1', name: 'ABC Kitchen & Bath' },
          { id: 'org-2', name: 'XYZ Construction' },
        ],
        activeTenantId: 'org-1',
      },
      activeTenant: { id: 'org-1', name: 'ABC Kitchen & Bath' },
      selectTenant,
    });

    render(<BusinessContextSwitcher />);
    await userEvent.click(screen.getByRole('button', { name: 'XYZ Construction' }));

    expect(selectTenant).toHaveBeenCalledWith('org-2');
  });

  it('surfaces a pending-invitation count linking to the invitations page', () => {
    mockUseBusiness.mockReturnValue({
      state: { ...baseState, invitations: [{ id: 'inv-1' }, { id: 'inv-2' }] },
      activeTenant: null,
      selectTenant: jest.fn(),
    });

    render(<BusinessContextSwitcher />);

    const invitationsLink = screen.getByRole('link', { name: /Invitations/ });
    expect(invitationsLink).toHaveAttribute('href', '/business/invitations');
    expect(invitationsLink).toHaveTextContent('2');
  });
});
