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

function renderGreeting(now: Date) {
  return render(
    <SessionProvider>
      <SignedInAs>
        <Greeting now={now} />
      </SignedInAs>
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
