import { render, screen, waitFor } from '@testing-library/react';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { JourneyProvider } from '../../../state/journey/JourneyContext';
import { MemoryProvider } from '../../../state/memory/MemoryContext';
import { ConversationProvider } from '../../../state/conversation/ConversationContext';
import { MemorySidebar } from './MemorySidebar';
import * as goalsApi from '../../../lib/api/goals';
import * as journeysApi from '../../../lib/api/journeys';
import * as milestonesApi from '../../../lib/api/milestones';
import * as tasksApi from '../../../lib/api/tasks';
import * as memoryApi from '../../../lib/api/memory';

jest.mock('../../../lib/api/goals');
jest.mock('../../../lib/api/journeys');
jest.mock('../../../lib/api/milestones');
jest.mock('../../../lib/api/tasks');
jest.mock('../../../lib/api/memory');
jest.mock('../../../lib/api/conversations');

const mockedGoals = goalsApi as jest.Mocked<typeof goalsApi>;
const mockedJourneys = journeysApi as jest.Mocked<typeof journeysApi>;
const mockedMilestones = milestonesApi as jest.Mocked<typeof milestonesApi>;
const mockedTasks = tasksApi as jest.Mocked<typeof tasksApi>;
const mockedMemory = memoryApi as jest.Mocked<typeof memoryApi>;

const activeGoal = { id: 'goal-1', title: 'Find a better job', status: 'ACTIVE' as const, userId: 'member-1', createdAt: 'x', updatedAt: 'x', deletedAt: null };
const journey = { id: 'journey-1', title: 'Find a better job', status: 'ACTIVE' as const, goalId: 'goal-1', createdAt: 'x', updatedAt: 'x', deletedAt: null };
const milestone = { id: 'milestone-1', title: 'Get started', status: 'PENDING' as const, position: 0, journeyId: 'journey-1', createdAt: 'x', updatedAt: 'x', deletedAt: null };
const task = { id: 'task-1', title: 'Take the first step', status: 'PENDING' as const, priority: 'MEDIUM' as const, position: 0, milestoneId: 'milestone-1', createdAt: 'x', updatedAt: 'x', deletedAt: null };

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderSidebar() {
  return render(
    <SessionProvider>
      <JourneyProvider>
        <MemoryProvider>
          <ConversationProvider>
            <SignedInAs>
              <MemorySidebar />
            </SignedInAs>
          </ConversationProvider>
        </MemoryProvider>
      </JourneyProvider>
    </SessionProvider>,
  );
}

describe('MemorySidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedMemory.getMyMemory.mockResolvedValue({
      goals: [], activeJourney: null, savedOpportunities: [], savedResources: [],
      podMemberships: [], stewardshipRelationship: null, recentConversationSnippets: [],
    });
  });

  it('shows an empty state when the member has no active goal yet', async () => {
    mockedGoals.listGoals.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    renderSidebar();

    expect(await screen.findByText('No active goal yet')).toBeInTheDocument();
  });

  it('renders Current Goal, Desired Outcome, Progress, Suggested Next Step, Relevant Journey, and Recent Memory', async () => {
    mockedGoals.listGoals.mockResolvedValue({ data: [activeGoal], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockedJourneys.getJourneyByGoal.mockResolvedValue(journey);
    mockedMilestones.listMilestones.mockResolvedValue({ data: [milestone], total: 1, page: 1, limit: 100, totalPages: 1 });
    mockedTasks.listTasks.mockResolvedValue({ data: [task], total: 1, page: 1, limit: 100, totalPages: 1 });
    mockedMemory.getMyMemory.mockResolvedValue({
      goals: [], activeJourney: null, savedOpportunities: [], savedResources: [],
      podMemberships: [], stewardshipRelationship: null, recentConversationSnippets: ['I need help finding a job.'],
    });

    renderSidebar();

    await waitFor(() => expect(screen.getAllByText('Find a better job').length).toBeGreaterThan(0));
    expect(screen.getByText('You want to: Find a better job')).toBeInTheDocument();
    expect(await screen.findByText('0 of 1 milestones complete')).toBeInTheDocument();
    expect(screen.getByText('Take the first step — Get started')).toBeInTheDocument();
    expect(screen.getByText('I need help finding a job.')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    mockedGoals.listGoals.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    const { container } = renderSidebar();
    await screen.findByText('No active goal yet');
    expect(await axe(container)).toHaveNoViolations();
  });
});
