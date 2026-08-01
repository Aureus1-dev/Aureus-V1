import { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RootPage from './page';
import { useSession } from '../state';

jest.mock('../state', () => ({ useSession: jest.fn() }));

const replace = jest.fn();
// A stable router object, matching real `useRouter()` — recreating `{ replace }`
// on every call would change RootPage's effect dependencies (and thus cancel
// its in-flight guest-session promise) on any re-render, which the mocked
// ArrivalScene below now triggers once by finishing on mount.
const router = { replace };
jest.mock('next/navigation', () => ({ useRouter: () => router }));

// RootPage's own concern is session-routing logic, not the Opening
// Sequence's timed animation (covered by ArrivalScene.test.tsx) — this
// stub finishes the "sequence" on mount so these tests stay fast and
// deterministic, while still rendering the same "How can we help?" copy
// the real component settles on.
jest.mock('../design-system/components/arrival', () => ({
  // Only the timed sequence is stubbed. The room, the stage and the
  // capacity copy stay real, so the at-capacity branch below is exercised
  // as it actually renders.
  ...jest.requireActual('../design-system/components/arrival'),
  ArrivalScene: ({ onFinished }: { onFinished: () => void }) => {
    useEffect(() => {
      onFinished();
    }, [onFinished]);
    return <p>How can we help?</p>;
  },
}));

const mockedUseSession = useSession as jest.Mock;

describe('RootPage — Guest Steward mode', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('shows a "How can we help?" loading state, not a bare spinner, while establishing a session', () => {
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: true,
      sessionExpired: false,
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
      sessionExpired: false,
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
      sessionExpired: false,
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
      sessionExpired: false,
      establishGuestSession,
    });

    render(<RootPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });
});

describe('RootPage — identity continuity for a returning member', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  /**
   * The four ways a member comes back to a session that can no longer be
   * refreshed: the refresh token expired, the browser restored a tab from
   * a previous run, a second tab already rotated the token, or the browser
   * was restarted entirely. Every one of them surfaces to the client the
   * same way — `sessionExpired` — and every one of them must reach the
   * same place. None may mint a new guest.
   */
  it.each([
    ['an expired refresh token'],
    ['a restored browser session'],
    ['a second tab that already rotated the token'],
    ['a browser restart'],
  ])('never creates a new identity after %s — it explains and sends them to sign in', async () => {
    const establishGuestSession = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: true,
      establishGuestSession,
    });

    render(<RootPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?expired=1'));
    // The whole point: no new guest identity is minted, so the member's
    // existing goals and journey are never orphaned.
    expect(establishGuestSession).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalledWith('/conversation');
  });

  it('does not show the opening sequence to an expired member — that would read as a first arrival', () => {
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: true,
      establishGuestSession: jest.fn(),
    });

    render(<RootPage />);
    expect(screen.queryByText('How can we help?')).not.toBeInTheDocument();
  });

  it('still guests a genuinely new visitor — the expiry guard must not close the front door', async () => {
    const establishGuestSession = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: false,
      establishGuestSession,
    });

    render(<RootPage />);

    await waitFor(() => expect(establishGuestSession).toHaveBeenCalled());
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/conversation'));
    expect(replace).not.toHaveBeenCalledWith('/login?expired=1');
  });

  it('sends an expired member to sign in rather than waiting on the session to restore', async () => {
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: true,
      sessionExpired: true,
      establishGuestSession: jest.fn(),
    });
    const { rerender } = render(<RootPage />);
    expect(replace).not.toHaveBeenCalled(); // still restoring: decide nothing yet

    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: true,
      establishGuestSession: jest.fn(),
    });
    rerender(<RootPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?expired=1'));
  });
});

describe('RootPage — the front door at capacity', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('explains that traffic is heavy instead of bouncing the visitor to a login wall', async () => {
    const { ApiError } = jest.requireActual('../lib/api/errors');
    const establishGuestSession = jest.fn().mockRejectedValue(new ApiError(429, 'Too many requests'));
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: false,
      establishGuestSession,
    });

    render(<RootPage />);

    await waitFor(() =>
      expect(screen.getByText("We're seeing unusual traffic right now")).toBeInTheDocument(),
    );
    // The promise of Guest Steward mode is that no account is required —
    // a busy moment must never quietly turn into a sign-in requirement.
    expect(replace).not.toHaveBeenCalledWith('/login');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('still falls back to sign-in when the API is unreachable, not merely busy', async () => {
    const establishGuestSession = jest.fn().mockRejectedValue(new Error('network down'));
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: false,
      establishGuestSession,
    });

    render(<RootPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  });

  it('retries establishing a session when the visitor asks', async () => {
    const { ApiError } = jest.requireActual('../lib/api/errors');
    const establishGuestSession = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(429, 'Too many requests'))
      .mockResolvedValueOnce(undefined);
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: false,
      establishGuestSession,
    });

    render(<RootPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(establishGuestSession).toHaveBeenCalledTimes(2));
  });
});
