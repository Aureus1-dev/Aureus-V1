import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { JourneyProvider } from '../../../state/journey/JourneyContext';
import { MemoryProvider } from '../../../state/memory/MemoryContext';
import { ConversationProvider } from '../../../state/conversation/ConversationContext';
import { StewardPanel } from './StewardPanel';
import * as goalsApi from '../../../lib/api/goals';
import * as memoryApi from '../../../lib/api/memory';

jest.mock('../../../lib/api/goals');
jest.mock('../../../lib/api/journeys');
jest.mock('../../../lib/api/milestones');
jest.mock('../../../lib/api/tasks');
jest.mock('../../../lib/api/memory');
jest.mock('../../../lib/api/conversations');

const mockedGoals = goalsApi as jest.Mocked<typeof goalsApi>;
const mockedMemory = memoryApi as jest.Mocked<typeof memoryApi>;

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderPanel() {
  return render(
    <SessionProvider>
      <JourneyProvider>
        <MemoryProvider>
          <ConversationProvider>
            <SignedInAs>
              <StewardPanel />
            </SignedInAs>
          </ConversationProvider>
        </MemoryProvider>
      </JourneyProvider>
    </SessionProvider>,
  );
}

describe('StewardPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGoals.listGoals.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    mockedMemory.getMyMemory.mockResolvedValue({
      goals: [], activeJourney: null, savedOpportunities: [], savedResources: [],
      podMemberships: [], stewardshipRelationship: null, recentConversationSnippets: [],
    });
  });

  it('renders as a labeled landmark with its title and the Memory Sidebar content', async () => {
    renderPanel();
    expect(screen.getByRole('complementary', { name: 'Steward context' })).toBeInTheDocument();
    expect(screen.getByText('Your Steward')).toBeInTheDocument();
    expect(await screen.findByText('No active goal yet')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderPanel();
    await screen.findByText('No active goal yet');
    expect(await axe(container)).toHaveNoViolations();
  });
});
