import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { StewardshipOversightProvider } from '../../../state/stewardship-oversight/StewardshipOversightContext';
import { StewardshipOversightPanel } from './StewardshipOversightPanel';

import * as usersApi from '../../../lib/api/users';
import * as stewardshipApi from '../../../lib/api/stewardship';
import type { UserDto } from '../../../lib/api/users';
import type { StewardMetricsDto, StewardshipRelationshipDto } from '../../../lib/api/stewardship';

jest.mock('../../../lib/api/users');
jest.mock('../../../lib/api/stewardship');

const mockedUsersApi = usersApi as jest.Mocked<typeof usersApi>;
const mockedStewardshipApi = stewardshipApi as jest.Mocked<typeof stewardshipApi>;

const NOW = '2026-01-01T00:00:00Z';

function makeSteward(o: Partial<UserDto> = {}): UserDto {
  return {
    id: 'steward-1', email: 'steward@example.com', emailVerified: true, roles: ['STEWARD'], status: 'ACTIVE',
    createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
  };
}

function makeMetrics(o: Partial<StewardMetricsDto> = {}): StewardMetricsDto {
  return {
    stewardId: 'steward-1', activeMemberCount: 5, capacity: 25, tasksCompleted: 3, escalationsResolved: 1,
    memberGoalCompletionRate: 50, averageJourneyProgress: 40, averageResponseTimeHours: null,
    memberSatisfactionScore: null, generatedAt: NOW, ...o,
  };
}

function makeRelationship(o: Partial<StewardshipRelationshipDto> = {}): StewardshipRelationshipDto {
  return {
    id: 'rel-1', memberId: 'member-1', stewardId: 'steward-1', status: 'ACTIVE', origin: 'ADMIN_ASSIGNMENT',
    requestedById: null, assignedById: 'admin-1', assignedByOrganizationId: null, recommendedById: null,
    endReason: null, endedById: null, endedAt: null, activatedAt: NOW, createdAt: NOW, updatedAt: NOW, ...o,
  };
}

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'admin-1', email: 'admin@example.com' });
  }
  return <>{children}</>;
}

function renderPanel() {
  return render(
    <SessionProvider>
      <StewardshipOversightProvider>
        <SignedInAs>
          <StewardshipOversightPanel />
        </SignedInAs>
      </StewardshipOversightProvider>
    </SessionProvider>,
  );
}

describe('StewardshipOversightPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the steward roster with metrics and the relationship roster', async () => {
    mockedUsersApi.listUsers.mockResolvedValue({ data: [makeSteward()], total: 1, page: 1, limit: 100, totalPages: 1 });
    mockedStewardshipApi.listStewardshipRelationships.mockResolvedValue({
      data: [makeRelationship()], total: 1, page: 1, limit: 100, totalPages: 1,
    });
    mockedStewardshipApi.getStewardMetrics.mockResolvedValue(makeMetrics());

    renderPanel();

    expect(await screen.findByText('steward@example.com')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Relationships (1)')).toBeInTheDocument();
    expect(screen.getByText('member-1')).toBeInTheDocument();
  });

  it('shows empty states when there are no stewards or relationships', async () => {
    mockedUsersApi.listUsers.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100, totalPages: 0 });
    mockedStewardshipApi.listStewardshipRelationships.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100, totalPages: 0 });

    renderPanel();

    expect(await screen.findByText('No stewards yet')).toBeInTheDocument();
    expect(screen.getByText('No relationships yet')).toBeInTheDocument();
  });

  it('shows a retryable error state when loading fails', async () => {
    mockedUsersApi.listUsers.mockRejectedValue(new Error('boom'));
    mockedStewardshipApi.listStewardshipRelationships.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100, totalPages: 0 });

    renderPanel();

    expect(await screen.findByText("Stewardship oversight couldn't be loaded")).toBeInTheDocument();
  });

  it('has no accessibility violations once fully loaded', async () => {
    mockedUsersApi.listUsers.mockResolvedValue({ data: [makeSteward()], total: 1, page: 1, limit: 100, totalPages: 1 });
    mockedStewardshipApi.listStewardshipRelationships.mockResolvedValue({
      data: [makeRelationship()], total: 1, page: 1, limit: 100, totalPages: 1,
    });
    mockedStewardshipApi.getStewardMetrics.mockResolvedValue(makeMetrics());

    const { container } = renderPanel();
    await screen.findByText('steward@example.com');
    expect(await axe(container)).toHaveNoViolations();
  });
});
