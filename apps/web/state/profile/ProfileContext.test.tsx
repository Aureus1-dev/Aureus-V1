import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { ProfileProvider, useProfile } from './ProfileContext';
import * as profileApi from '../../lib/api/profile';
import { ApiError } from '../../lib/api/errors';
import type { ProfileDto } from '../../lib/api/profile';

jest.mock('../../lib/api/profile');

const mockedApi = profileApi as jest.Mocked<typeof profileApi>;

function makeProfile(o: Partial<ProfileDto> = {}): ProfileDto {
  return {
    id: 'profile-1', userId: 'member-1', displayName: 'Alice', bio: null, avatarUrl: null, city: null,
    region: null, stateProvince: null, country: null, localAreaDescription: null, profession: null,
    seasonOfLife: null, availabilityNotes: null, preferredLanguage: null, faithPreference: null,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null, ...o,
  };
}

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useProfile> & { setToken: (t: string | null) => void }) => void }) {
  const profile = useProfile();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...profile,
      setToken: (token: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId: token ? 'member-1' : null }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useProfile> & { setToken: (t: string | null) => void };
  render(
    <SessionProvider>
      <ProfileProvider>
        <Harness onReady={(value) => (api = value)} />
      </ProfileProvider>
    </SessionProvider>,
  );
  return () => api;
}

describe('ProfileContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the current profile', async () => {
    mockedApi.getMyProfile.mockResolvedValue(makeProfile());
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    expect(mockedApi.getMyProfile).toHaveBeenCalledWith('token-123', 'member-1');
    expect(getApi().state.profile?.displayName).toBe('Alice');
  });

  it('loads null when no profile exists yet, without treating it as an error', async () => {
    mockedApi.getMyProfile.mockResolvedValue(null);
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    expect(getApi().state.profile).toBeNull();
    expect(getApi().state.error).toBeNull();
  });

  it('creates a profile on first save', async () => {
    mockedApi.getMyProfile.mockResolvedValue(null);
    mockedApi.createMyProfile.mockResolvedValue(makeProfile({ displayName: 'Bob' }));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    await act(async () => getApi().save({ displayName: 'Bob' }));

    expect(mockedApi.createMyProfile).toHaveBeenCalledWith('token-123', 'member-1', { displayName: 'Bob' });
    expect(mockedApi.updateMyProfile).not.toHaveBeenCalled();
    expect(getApi().state.profile?.displayName).toBe('Bob');
  });

  it('updates an existing profile on subsequent saves', async () => {
    mockedApi.getMyProfile.mockResolvedValue(makeProfile());
    mockedApi.updateMyProfile.mockResolvedValue(makeProfile({ displayName: 'Alice Updated' }));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    await act(async () => getApi().save({ displayName: 'Alice Updated' }));

    expect(mockedApi.updateMyProfile).toHaveBeenCalledWith('token-123', 'member-1', { displayName: 'Alice Updated' });
    expect(mockedApi.createMyProfile).not.toHaveBeenCalled();
  });

  it('classifies a validation error and clears it on request', async () => {
    mockedApi.getMyProfile.mockResolvedValue(null);
    mockedApi.createMyProfile.mockRejectedValue(new ApiError(400, 'Bio is too long'));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().load());

    await act(async () => getApi().save({ bio: 'x'.repeat(1000) }));

    expect(getApi().state.error?.kind).toBe('validation');
    act(() => getApi().clearError());
    expect(getApi().state.error).toBeNull();
  });

  it('requires authentication before loading or saving', async () => {
    const getApi = renderHarness();
    await act(async () => getApi().load());
    await act(async () => getApi().save({ displayName: 'Nope' }));

    expect(mockedApi.getMyProfile).not.toHaveBeenCalled();
    expect(mockedApi.createMyProfile).not.toHaveBeenCalled();
  });
});
