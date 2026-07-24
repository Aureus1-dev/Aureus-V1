import { render, screen } from '@testing-library/react';
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
    mockedUseSession.mockReturnValue({ session: { isAuthenticated: false }, isRestoring: true, sessionExpired: false });

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
    mockedUseSession.mockReturnValue({ session: { isAuthenticated: true }, isRestoring: false, sessionExpired: false });

    render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects to /login once restoration completes and the member is unauthenticated', () => {
    mockedUseSession.mockReturnValue({ session: { isAuthenticated: false }, isRestoring: false, sessionExpired: false });

    render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    expect(replace).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects to /login?expired=1 when the session could not be silently restored', () => {
    mockedUseSession.mockReturnValue({ session: { isAuthenticated: false }, isRestoring: false, sessionExpired: true });

    render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    expect(replace).toHaveBeenCalledWith('/login?expired=1');
  });

  it('B5: no leakage across the transition — protected content stops rendering the instant a mid-session flips to unauthenticated', () => {
    mockedUseSession.mockReturnValue({ session: { isAuthenticated: true }, isRestoring: false, sessionExpired: false });

    const { rerender } = render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );
    expect(screen.getByText('Protected content')).toBeInTheDocument();

    // A session expiring mid-arrival (e.g. a 401 that couldn't be silently
    // refreshed) flips isAuthenticated to false without a page reload.
    mockedUseSession.mockReturnValue({ session: { isAuthenticated: false }, isRestoring: false, sessionExpired: true });
    rerender(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/login?expired=1');
  });

  it('B5: no leakage across the transition — the unauthenticated redirect never fires again once a login completes', () => {
    mockedUseSession.mockReturnValue({ session: { isAuthenticated: false }, isRestoring: false, sessionExpired: false });

    const { rerender } = render(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );
    expect(replace).toHaveBeenCalledWith('/login');
    replace.mockClear();

    mockedUseSession.mockReturnValue({ session: { isAuthenticated: true }, isRestoring: false, sessionExpired: false });
    rerender(
      <AuthGate>
        <div>Protected content</div>
      </AuthGate>,
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
