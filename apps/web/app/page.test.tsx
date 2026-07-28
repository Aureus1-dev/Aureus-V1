import { render, screen, waitFor } from '@testing-library/react';
import RootPage from './page';
import { useSession } from '../state';

jest.mock('../state', () => ({ useSession: jest.fn() }));

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const mockedUseSession = useSession as jest.Mock;

describe('RootPage — Guest Steward mode', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('shows a "How can we help?" loading state, not a bare spinner, while establishing a session', () => {
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: true,
      establishGuestSession: jest.fn(),
    });

    render(<RootPage />);
    expect(screen.getByText('How can we help?')).toBeInTheDocument();
  });

  it('sends an already-authenticated visitor (member or guest) to /welcome, unchanged from prior behavior', async () => {
    const establishGuestSession = jest.fn();
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: true },
      isRestoring: false,
      establishGuestSession,
    });

    render(<RootPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/welcome'));
    expect(establishGuestSession).not.toHaveBeenCalled();
  });

  it('silently establishes a guest session for a visitor with no session, then goes straight to conversation', async () => {
    const establishGuestSession = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      establishGuestSession,
    });

    render(<RootPage />);

    await waitFor(() => expect(establishGuestSession).toHaveBeenCalled());
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/conversation'));
  });

  it('falls back to /login if a guest session cannot be established', async () => {
    const establishGuestSession = jest.fn().mockRejectedValue(new Error('network down'));
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      establishGuestSession,
    });

    render(<RootPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });
});
