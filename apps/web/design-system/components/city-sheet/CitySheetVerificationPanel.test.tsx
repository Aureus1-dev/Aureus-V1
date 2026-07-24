import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { CitySheetProvider } from '../../../state/city-sheet/CitySheetContext';
import { CitySheetVerificationPanel } from './CitySheetVerificationPanel';
import * as citySheetApi from '../../../lib/api/city-sheet';
import type { CitySheetEntryDto, VerificationGuideDto } from '../../../lib/api/city-sheet';

jest.mock('../../../lib/api/city-sheet');

const mockedApi = citySheetApi as jest.Mocked<typeof citySheetApi>;

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'steward-1', email: 'steward@example.com' });
  }
  return <>{children}</>;
}

function renderPanel() {
  return render(
    <SessionProvider>
      <CitySheetProvider>
        <SignedInAs>
          <CitySheetVerificationPanel />
        </SignedInAs>
      </CitySheetProvider>
    </SessionProvider>,
  );
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
    callScript: 'Hello, I am calling to confirm your hours and services.', ...overrides,
  };
}

describe('CitySheetVerificationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an empty state when nothing is pending for the selected status', async () => {
    mockedApi.listCitySheetEntries.mockResolvedValue({ data: [], total: 0, page: 1, limit: 50, totalPages: 0 });
    renderPanel();
    expect(await screen.findByText('Nothing here')).toBeInTheDocument();
  });

  it('lists a pending entry with its ref, name, and category', async () => {
    mockedApi.listCitySheetEntries.mockResolvedValue({ data: [makeEntry()], total: 1, page: 1, limit: 50, totalPages: 1 });
    renderPanel();
    expect(await screen.findByText('Chester County Crisis Line')).toBeInTheDocument();
    expect(screen.getByText('AUR-CS-000001')).toBeInTheDocument();
    expect(screen.getByText('CRISIS LINE')).toBeInTheDocument();
  });

  it('opens an entry to show its call script and checklist', async () => {
    mockedApi.listCitySheetEntries.mockResolvedValue({ data: [makeEntry()], total: 1, page: 1, limit: 50, totalPages: 1 });
    mockedApi.getVerificationGuide.mockResolvedValue(makeGuide());
    mockedApi.listVerificationHistory.mockResolvedValue([]);
    const user = userEvent.setup();

    renderPanel();
    await screen.findByText('Chester County Crisis Line');
    await user.click(screen.getByRole('button', { name: 'Review' }));

    expect(await screen.findByText('Hello, I am calling to confirm your hours and services.')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm the phone number connects')).toBeInTheDocument();
  });

  it('verifies an entry with the chosen confidence and removes it from the queue', async () => {
    mockedApi.listCitySheetEntries.mockResolvedValue({ data: [makeEntry()], total: 1, page: 1, limit: 50, totalPages: 1 });
    mockedApi.getVerificationGuide.mockResolvedValue(makeGuide());
    mockedApi.listVerificationHistory.mockResolvedValue([]);
    mockedApi.verifyCitySheetEntry.mockResolvedValue(makeEntry({ verificationStatus: 'VERIFIED' }));
    const user = userEvent.setup();

    renderPanel();
    await screen.findByText('Chester County Crisis Line');
    await user.click(screen.getByRole('button', { name: 'Review' }));
    await screen.findByText('Hello, I am calling to confirm your hours and services.');

    await user.click(screen.getByLabelText('Confirm the phone number connects'));
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() =>
      expect(mockedApi.verifyCitySheetEntry).toHaveBeenCalledWith('token-123', 'entry-1', {
        confidence: 'HIGH',
        verificationNotes: undefined,
        checklistResponses: [{ itemId: 'item-1', label: 'Confirm the phone number connects', confirmed: true }],
      }),
    );
    await waitFor(() => expect(screen.queryByText('Chester County Crisis Line')).not.toBeInTheDocument());
  });

  it('requires at least 3 characters of notes before rejection is enabled', async () => {
    mockedApi.listCitySheetEntries.mockResolvedValue({ data: [makeEntry()], total: 1, page: 1, limit: 50, totalPages: 1 });
    mockedApi.getVerificationGuide.mockResolvedValue(makeGuide());
    mockedApi.listVerificationHistory.mockResolvedValue([]);
    mockedApi.rejectCitySheetEntry.mockResolvedValue(makeEntry({ verificationStatus: 'REJECTED' }));
    const user = userEvent.setup();

    renderPanel();
    await screen.findByText('Chester County Crisis Line');
    await user.click(screen.getByRole('button', { name: 'Review' }));
    await screen.findByText('Hello, I am calling to confirm your hours and services.');

    const rejectButton = screen.getByRole('button', { name: 'Reject' });
    expect(rejectButton).toBeDisabled();

    await user.type(screen.getByLabelText('Notes (required to reject or flag for review)'), 'Phone is disconnected.');
    expect(rejectButton).not.toBeDisabled();

    await user.click(rejectButton);
    await waitFor(() =>
      expect(mockedApi.rejectCitySheetEntry).toHaveBeenCalledWith('token-123', 'entry-1', {
        reason: 'Phone is disconnected.',
        confidence: 'HIGH',
        checklistResponses: [{ itemId: 'item-1', label: 'Confirm the phone number connects', confirmed: false }],
      }),
    );
  });

  it('has no accessibility violations with an open entry', async () => {
    mockedApi.listCitySheetEntries.mockResolvedValue({ data: [makeEntry()], total: 1, page: 1, limit: 50, totalPages: 1 });
    mockedApi.getVerificationGuide.mockResolvedValue(makeGuide());
    mockedApi.listVerificationHistory.mockResolvedValue([]);
    const user = userEvent.setup();

    const { container } = renderPanel();
    await screen.findByText('Chester County Crisis Line');
    await user.click(screen.getByRole('button', { name: 'Review' }));
    await screen.findByText('Hello, I am calling to confirm your hours and services.');

    expect(await axe(container)).toHaveNoViolations();
  });
});
