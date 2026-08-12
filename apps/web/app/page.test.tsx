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

  it('sends an already-authenticated visitor into the conversational Hall', async () => {
    const establishGuestSession = jest.fn();
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: true },
      isRestoring: false,
      sessionExpired: false,
      establishGuestSession,
    });

    render(<RootPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/conversation'));
    expect(replace).not.toHaveBeenCalledWith('/welcome');
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

  it('keeps the Hall open with a retry if a guest session cannot be established', async () => {
    const establishGuestSession = jest.fn().mockRejectedValue(new Error('network down'));
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: false,
      establishGuestSession,
    });

    render(<RootPage />);

    await waitFor(() =>
      expect(screen.getByText("We couldn't open the conversation")).toBeInTheDocument(),
    );
    expect(replace).not.toHaveBeenCalledWith('/login');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('RootPage — help-first recovery for a returning member', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it.each([
    ['an expired refresh token'],
    ['a restored browser session'],
    ['a second tab that already rotated the token'],
    ['a browser restart'],
  ])('opens a fresh guest conversation after %s without forcing sign-in', async () => {
    const establishGuestSession = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: true,
      establishGuestSession,
    });

    render(<RootPage />);

    await waitFor(() => expect(establishGuestSession).toHaveBeenCalled());
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/conversation'));
    expect(replace).not.toHaveBeenCalledWith('/login?expired=1');
    expect(replace).not.toHaveBeenCalledWith('/welcome');
  });

  it('shows the living Hall while an expired session is replaced with a guest session', () => {
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: true,
      establishGuestSession: jest.fn().mockReturnValue(new Promise(() => undefined)),
    });

    render(<RootPage />);
    expect(screen.getByText('How can we help?')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalledWith('/login?expired=1');
  });

  it('waits for restoration to finish before opening the fresh guest conversation', async () => {
    const establishGuestSession = jest.fn().mockResolvedValue(undefined);
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: true,
      sessionExpired: true,
      establishGuestSession,
    });
    const { rerender } = render(<RootPage />);
    expect(establishGuestSession).not.toHaveBeenCalled();

    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: true,
      establishGuestSession,
    });
    rerender(<RootPage />);

    await waitFor(() => expect(establishGuestSession).toHaveBeenCalled());
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/conversation'));
  });
});

describe('RootPage — the front door at capacity', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('explains that traffic is heavy instead of bouncing the visitor to a login wall', async () => {
    const { ApiError } = jest.requireActual('../lib/api/errors');
    const establishGuestSession = jest
      .fn()
      .mockRejectedValue(new ApiError(429, 'Too many requests'));
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

  it('does not turn an unreachable API into a sign-in requirement', async () => {
    const establishGuestSession = jest.fn().mockRejectedValue(new Error('network down'));
    mockedUseSession.mockReturnValue({
      session: { isAuthenticated: false },
      isRestoring: false,
      sessionExpired: false,
      establishGuestSession,
    });

    render(<RootPage />);

    await waitFor(() =>
      expect(screen.getByText("We couldn't open the conversation")).toBeInTheDocument(),
    );
    expect(replace).not.toHaveBeenCalledWith('/login');
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
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(establishGuestSession).toHaveBeenCalledTimes(2));
  });
});
