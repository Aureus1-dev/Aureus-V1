import { render, screen, waitFor } from '@testing-library/react';
import { AuthGate } from './AuthGate';
import { useSession } from '../../../state';

jest.mock('../../../state', () => ({ useSession: jest.fn() }));

const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const mockedUseSession = useSession as jest.Mock;

describe('AuthGate', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('shows a loading state and does not redirect while restoring', () => {
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: true,
      sessionExpired: false,
      establishGuestSession: jest.fn(),
    });

    render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    expect(screen.getByText('Preparing your session')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('renders protected content once authenticated', () => {
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: true },
      isRestoring: false,
      sessionExpired: false,
      establishGuestSession: jest.fn(),
    });

    render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  // Guest Steward mode: a visitor with no session at all (a direct link
  // to /opportunities, /journey, /resources, ... — not only the root
  // page) must never dead-end at a login wall. AuthGate now silently
  // establishes a guest session here instead of redirecting.
  it('silently establishes a guest session for a visitor with no session, instead of redirecting to /login', async () => {
    const establishGuestSession = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: false,
      establishGuestSession,
    });

    render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    await waitFor(() => expect(establishGuestSession).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('falls back to /login only if guest session establishment itself fails', async () => {
    const establishGuestSession = jest.fn().mockRejectedValue(new Error('network down'));
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: false,
      establishGuestSession,
    });

    render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  // A session that existed and failed to refresh is deliberately NOT
  // silently re-guested — that would quietly drop a real member into
  // anonymous browsing instead of prompting them back into their own
  // account. This path is unchanged from before Guest Steward mode.
  it('redirects to /login?expired=1 when the session could not be silently restored, without attempting a guest session', () => {
    const establishGuestSession = jest.fn();
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: true,
      establishGuestSession,
    });

    render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    expect(replace).toHaveBeenCalledWith('/login?expired=1');
    expect(establishGuestSession).not.toHaveBeenCalled();
  });

  it('B5: no leakage across the transition — protected content stops rendering the instant a mid-session flips to unauthenticated', () => {
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: true },
      isRestoring: false,
      sessionExpired: false,
      establishGuestSession: jest.fn(),
    });

    const { rerender } = render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();

    // A session expiring mid-arrival (e.g. a 401 that couldn't be silently
    // refreshed) flips isAuthenticated to false without a page reload.
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: true,
      establishGuestSession: jest.fn(),
    });
    rerender(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/login?expired=1');
  });

  it('B5: no leakage across the transition — no redirect fires once a login (or guest session) completes', () => {
    const establishGuestSession = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: false,
      establishGuestSession,
    });

    const { rerender } = render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );
    expect(establishGuestSession).toHaveBeenCalled();
    replace.mockClear();

    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: true },
      isRestoring: false,
      sessionExpired: false,
      establishGuestSession,
    });
    rerender(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
