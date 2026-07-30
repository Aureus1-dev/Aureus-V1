import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { Greeting } from './Greeting';
import * as profileApi from '../../../lib/api/profile';

jest.mock('../../../lib/api/profile');
const mockedProfile = profileApi as jest.Mocked<typeof profileApi>;

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1', email: 'alice@example.com' });
  }
  return <>{children}</>;
}

function SignedInAsGuest({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({
      ...session, isAuthenticated: true, isGuest: true, accessToken: 'token-123', memberId: 'member-1',
      email: 'guest+68da4175-b20f-4b2b-8ca6-15154dcd1895@guest.aureus.internal',
    });
  }
  return <>{children}</>;
}

function renderGreeting(now: Date) {
  return render(
    <SessionProvider>
      <SignedInAs>
        <Greeting now={now} />
      </SignedInAs>
    </SessionProvider>,
  );
}

function renderGuestGreeting(now: Date) {
  return render(
    <SessionProvider>
      <SignedInAsGuest>
        <Greeting now={now} />
      </SignedInAsGuest>
    </SessionProvider>,
  );
}

describe('Greeting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('greets with a display name once the profile resolves', async () => {
    mockedProfile.getMyProfile.mockResolvedValue({
      id: 'p-1', userId: 'member-1', displayName: 'Alice', bio: null, avatarUrl: null, city: null, region: null,
      stateProvince: null, country: null, localAreaDescription: null, profession: null, seasonOfLife: null,
      availabilityNotes: null, preferredLanguage: null, faithPreference: null, createdAt: 'x', updatedAt: 'x', deletedAt: null,
    });

    renderGreeting(new Date('2026-01-01T09:00:00'));

    expect(await screen.findByText('Good morning, Alice')).toBeInTheDocument();
  });

  it('falls back to an email-derived name when no profile exists yet (404)', async () => {
    mockedProfile.getMyProfile.mockResolvedValue(null);

    renderGreeting(new Date('2026-01-01T14:00:00'));

    expect(await screen.findByText('Good afternoon, alice')).toBeInTheDocument();
  });

  it('never greets a guest by their raw synthetic guest+<uuid> email local part', async () => {
    mockedProfile.getMyProfile.mockResolvedValue(null);

    renderGuestGreeting(new Date('2026-01-01T09:00:00'));

    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good morning');
    expect(screen.queryByText(/guest\+/)).not.toBeInTheDocument();
  });

  it('still greets a guest by name once they have a display name', async () => {
    mockedProfile.getMyProfile.mockResolvedValue({
      id: 'p-1', userId: 'member-1', displayName: 'Alex', bio: null, avatarUrl: null, city: null, region: null,
      stateProvince: null, country: null, localAreaDescription: null, profession: null, seasonOfLife: null,
      availabilityNotes: null, preferredLanguage: null, faithPreference: null, createdAt: 'x', updatedAt: 'x', deletedAt: null,
    });

    renderGuestGreeting(new Date('2026-01-01T09:00:00'));

    expect(await screen.findByText('Good morning, Alex')).toBeInTheDocument();
  });

  it('uses evening copy after 6pm', () => {
    mockedProfile.getMyProfile.mockResolvedValue(null);
    renderGreeting(new Date('2026-01-01T20:00:00'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good evening');
  });

  it('has no accessibility violations', async () => {
    mockedProfile.getMyProfile.mockResolvedValue(null);
    const { container } = renderGreeting(new Date('2026-01-01T09:00:00'));
    expect(await axe(container)).toHaveNoViolations();
  });
});
