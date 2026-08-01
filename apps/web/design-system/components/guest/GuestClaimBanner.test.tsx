import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { GuestClaimBanner } from './GuestClaimBanner';
import { useJourney, useSession } from '../../../state';

jest.mock('../../../state', () => ({ useSession: jest.fn(), useJourney: jest.fn() }));

const mockedUseSession = useSession as jest.Mock;
const mockedUseJourney = useJourney as jest.Mock;

/** A guest who has already created their first goal — i.e. there genuinely is something worth keeping. */
function guestWithAGoal() {
  mockedUseSession.mockReturnValue({ session: { isGuest: true, isAuthenticated: true } });
  mockedUseJourney.mockReturnValue({ state: { goals: [{ id: 'goal-1' }] }, loadGoals: jest.fn() });
}

describe('GuestClaimBanner', () => {
  beforeEach(() => {
    mockedUseJourney.mockReturnValue({ state: { goals: [] }, loadGoals: jest.fn() });
  });

  it('renders nothing for an already-claimed member session', () => {
    mockedUseSession.mockReturnValue({ session: { isGuest: false, isAuthenticated: true } });
    const { container } = render(<GuestClaimBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says nothing to a guest who has not built anything yet — the offer would be describing work that does not exist', () => {
    mockedUseSession.mockReturnValue({ session: { isGuest: true, isAuthenticated: true } });
    const { container } = render(<GuestClaimBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers to create a free account once the guest has a goal worth keeping', () => {
    guestWithAGoal();
    render(<GuestClaimBanner />);

    expect(screen.getByText(/built something worth keeping/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create free account' })).toHaveAttribute('href', '/register');
  });

  it('loads goals itself, so the offer is not dependent on another surface having done it', () => {
    const loadGoals = jest.fn();
    mockedUseSession.mockReturnValue({ session: { isGuest: true, isAuthenticated: true } });
    mockedUseJourney.mockReturnValue({ state: { goals: [] }, loadGoals });

    render(<GuestClaimBanner />);
    expect(loadGoals).toHaveBeenCalled();
  });

  it('can be dismissed', async () => {
    guestWithAGoal();
    render(<GuestClaimBanner />);

    await userEvent.click(screen.getByRole('button', { name: 'Not now' }));

    expect(screen.queryByText(/built something worth keeping/i)).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    guestWithAGoal();
    const { container } = render(<GuestClaimBanner />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
