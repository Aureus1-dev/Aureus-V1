import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { ProfileProvider } from '../../../state/profile/ProfileContext';
import { ProfilePage } from './ProfilePage';
import * as profileApi from '../../../lib/api/profile';
import type { ProfileDto } from '../../../lib/api/profile';

jest.mock('../../../lib/api/profile');

const mockedApi = profileApi as jest.Mocked<typeof profileApi>;

function makeProfile(o: Partial<ProfileDto> = {}): ProfileDto {
  return {
    id: 'profile-1', userId: 'member-1', displayName: 'Alice', bio: 'A short bio', avatarUrl: null, city: 'Austin',
    region: null, stateProvince: 'Texas', country: 'United States', localAreaDescription: null, profession: 'Nurse',
    seasonOfLife: null, availabilityNotes: null, preferredLanguage: null, faithPreference: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null, ...o,
  };
}

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderPage() {
  return render(
    <SessionProvider>
      <ProfileProvider>
        <SignedInAs>
          <ProfilePage />
        </SignedInAs>
      </ProfileProvider>
    </SessionProvider>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the loaded profile in view mode', async () => {
    mockedApi.getMyProfile.mockResolvedValue(makeProfile());
    renderPage();

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Nurse')).toBeInTheDocument();
    expect(screen.getByText('Austin, Texas, United States')).toBeInTheDocument();
  });

  it('shows a create-profile prompt when no profile exists', async () => {
    mockedApi.getMyProfile.mockResolvedValue(null);
    renderPage();

    expect(await screen.findByText("You haven't set up a profile yet")).toBeInTheDocument();
  });

  it('creates a profile through the edit form', async () => {
    mockedApi.getMyProfile.mockResolvedValue(null);
    mockedApi.createMyProfile.mockResolvedValue(makeProfile({ displayName: 'New Member' }));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Create profile' }));
    await userEvent.type(screen.getByLabelText('Display name'), 'New Member');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() =>
      expect(mockedApi.createMyProfile).toHaveBeenCalledWith('token-123', 'member-1', { displayName: 'New Member' }),
    );
    expect(await screen.findByText('New Member')).toBeInTheDocument();
  });

  it('edits an existing profile', async () => {
    mockedApi.getMyProfile.mockResolvedValue(makeProfile());
    mockedApi.updateMyProfile.mockResolvedValue(makeProfile({ displayName: 'Alice Updated' }));
    renderPage();
    await screen.findByText('Alice');

    await userEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    const nameField = screen.getByLabelText('Display name');
    await userEvent.clear(nameField);
    await userEvent.type(nameField, 'Alice Updated');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => expect(mockedApi.updateMyProfile).toHaveBeenCalled());
    expect(await screen.findByText('Alice Updated')).toBeInTheDocument();
  });

  it('cancels editing without saving', async () => {
    mockedApi.getMyProfile.mockResolvedValue(makeProfile());
    renderPage();
    await screen.findByText('Alice');

    await userEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockedApi.updateMyProfile).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
  });

  it('shows a sign-in prompt when unauthenticated', () => {
    render(
      <SessionProvider>
        <ProfileProvider>
          <ProfilePage />
        </ProfileProvider>
      </SessionProvider>,
    );

    expect(screen.getByText('Sign in to view your profile')).toBeInTheDocument();
    expect(mockedApi.getMyProfile).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    mockedApi.getMyProfile.mockResolvedValue(makeProfile());
    const { container } = renderPage();
    await screen.findByText('Alice');

    expect(await axe(container)).toHaveNoViolations();
  });
});
