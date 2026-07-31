import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
