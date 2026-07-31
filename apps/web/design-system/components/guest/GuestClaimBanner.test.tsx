import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { GuestClaimBanner } from './GuestClaimBanner';
import { useSession } from '../../../state';

jest.mock('../../../state', () => ({ useSession: jest.fn() }));

const mockedUseSession = useSession as jest.Mock;

describe('GuestClaimBanner', () => {
  it('renders nothing for an already-claimed member session', () => {
    mockedUseSession.mockReturnValue({ session: { isGuest: false } });
    const { container } = render(<GuestClaimBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers to create a free account for a guest session', () => {
    mockedUseSession.mockReturnValue({ session: { isGuest: true } });
    render(<GuestClaimBanner />);

    expect(screen.getByText(/built something worth keeping/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create free account' })).toHaveAttribute('href', '/register');
  });

  it('can be dismissed', async () => {
    mockedUseSession.mockReturnValue({ session: { isGuest: true } });
    render(<GuestClaimBanner />);

    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));

    expect(screen.queryByText(/built something worth keeping/i)).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    mockedUseSession.mockReturnValue({ session: { isGuest: true } });
    const { container } = render(<GuestClaimBanner />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
