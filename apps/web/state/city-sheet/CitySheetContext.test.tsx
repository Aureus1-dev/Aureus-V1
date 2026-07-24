import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { CitySheetProvider, useCitySheet } from './CitySheetContext';
import * as citySheetApi from '../../lib/api/city-sheet';
import { ApiError } from '../../lib/api/errors';
import type { CitySheetEntryDto, VerificationGuideDto } from '../../lib/api/city-sheet';

jest.mock('../../lib/api/city-sheet');

const mockedApi = citySheetApi as jest.Mocked<typeof citySheetApi>;

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useCitySheet> & { setToken: (t: string | null) => void }) => void }) {
  const citySheet = useCitySheet();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...citySheet,
      setToken: (token: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId: token ? 'steward-1' : null }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citySheet, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useCitySheet> & { setToken: (t: string | null) => void };
  render(
    <SessionProvider>
      <CitySheetProvider>
        <Harness onReady={(value) => (api = value)} />
      </CitySheetProvider>
    </SessionProvider>,
  );
  return () => api;
}

const NOW = '2026-07-24T00:00:00.000Z';

function makeEntry(overrides: Partial<CitySheetEntryDto> = {}): CitySheetEntryDto {
  return {
    id: 'entry-1', citySheetRef: 'AUR-CS-000001', organizationName: 'Chester County Crisis Line',
    category: 'CRISIS_LINE', description: 'Crisis support line.', address: null, serviceArea: 'Chester County',
    phone: '+1-610-555-0100', website: null, hours: '24/7', eligibilityRequirements: null,
    languagesSupported: [], accessibilityNotes: null, cost: null, requiredDocuments: [],
    referralRequired: false, isEmergencyService: true, isTestFixture: false,
    verificationStatus: 'UNVERIFIED', verificationConfidence: null, lastVerifiedAt: null,
    verifiedById: null, verificationNotes: null, rejectionReason: null, nextReviewDueAt: null,
    sourceNotes: 'Compiled via web research.', status: 'ACTIVE', createdById: 'steward-0',
    createdAt: NOW, updatedAt: NOW, ...overrides,
  };
}

function makeGuide(overrides: Partial<VerificationGuideDto> = {}): VerificationGuideDto {
  return {
    citySheetEntryId: 'entry-1', citySheetRef: 'AUR-CS-000001', organizationName: 'Chester County Crisis Line',
    category: 'CRISIS_LINE', currentVerificationStatus: 'UNVERIFIED',
    checklist: [{ id: 'item-1', label: 'Confirm the phone number connects' }],
    callScript: 'Hello, I am calling to confirm...', ...overrides,
  };
}

describe('CitySheetContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires authentication before loading and never calls the API unauthenticated', async () => {
    const getApi = renderHarness();
    await act(async () => getApi().loadQueue());
    expect(mockedApi.listCitySheetEntries).not.toHaveBeenCalled();
  });

  it('loads the UNVERIFIED queue by default', async () => {
    mockedApi.listCitySheetEntries.mockResolvedValue({ data: [makeEntry()], total: 1, page: 1, limit: 50, totalPages: 1 });

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadQueue());

    expect(mockedApi.listCitySheetEntries).toHaveBeenCalledWith('token-123', { verificationStatus: 'UNVERIFIED' });
    expect(getApi().state.entries).toHaveLength(1);
  });

  it('selecting an entry loads its verification guide and history together', async () => {
    mockedApi.listCitySheetEntries.mockResolvedValue({ data: [makeEntry()], total: 1, page: 1, limit: 50, totalPages: 1 });
    mockedApi.getVerificationGuide.mockResolvedValue(makeGuide());
    mockedApi.listVerificationHistory.mockResolvedValue([]);

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadQueue());
    await act(async () => getApi().selectEntry('entry-1'));

    expect(mockedApi.getVerificationGuide).toHaveBeenCalledWith('token-123', 'entry-1');
    expect(mockedApi.listVerificationHistory).toHaveBeenCalledWith('token-123', 'entry-1');
    expect(getApi().state.guide?.callScript).toBe('Hello, I am calling to confirm...');
  });

  it('verifying an entry removes it from the queue and clears the open selection', async () => {
    mockedApi.listCitySheetEntries.mockResolvedValue({ data: [makeEntry()], total: 1, page: 1, limit: 50, totalPages: 1 });
    mockedApi.getVerificationGuide.mockResolvedValue(makeGuide());
    mockedApi.listVerificationHistory.mockResolvedValue([]);
    mockedApi.verifyCitySheetEntry.mockResolvedValue(makeEntry({ verificationStatus: 'VERIFIED' }));

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadQueue());
    await act(async () => getApi().selectEntry('entry-1'));

    await act(async () =>
      getApi().verify('entry-1', { confidence: 'HIGH', verificationNotes: 'Confirmed by the office manager.' }),
    );

    expect(mockedApi.verifyCitySheetEntry).toHaveBeenCalledWith(
      'token-123', 'entry-1', { confidence: 'HIGH', verificationNotes: 'Confirmed by the office manager.' },
    );
    expect(getApi().state.entries).toHaveLength(0);
    expect(getApi().state.selectedEntryId).toBeNull();
  });

  it('rejecting an entry passes the reason and confidence through and removes it from the queue', async () => {
    mockedApi.listCitySheetEntries.mockResolvedValue({ data: [makeEntry()], total: 1, page: 1, limit: 50, totalPages: 1 });
    mockedApi.getVerificationGuide.mockResolvedValue(makeGuide());
    mockedApi.listVerificationHistory.mockResolvedValue([]);
    mockedApi.rejectCitySheetEntry.mockResolvedValue(makeEntry({ verificationStatus: 'REJECTED' }));

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadQueue());
    await act(async () => getApi().selectEntry('entry-1'));

    await act(async () =>
      getApi().reject('entry-1', { reason: 'Phone number is disconnected.', confidence: 'HIGH' }),
    );

    expect(mockedApi.rejectCitySheetEntry).toHaveBeenCalledWith(
      'token-123', 'entry-1', { reason: 'Phone number is disconnected.', confidence: 'HIGH' },
    );
    expect(getApi().state.entries).toHaveLength(0);
  });

  it('classifies a 403 as an authorization error distinct from authentication, and clears it on request', async () => {
    mockedApi.listCitySheetEntries.mockRejectedValue(new ApiError(403, 'Steward or Platform Administrator access required'));

    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadQueue());

    expect(getApi().state.error?.kind).toBe('authorization');
    act(() => getApi().clearError());
    expect(getApi().state.error).toBeNull();
  });
});
