import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../state/session/SessionContext';
import { JourneyProvider } from '../../state/journey/JourneyContext';
import { MemoryProvider } from '../../state/memory/MemoryContext';
import { ConversationProvider } from '../../state/conversation/ConversationContext';
import { AppShell } from './AppShell';
import * as goalsApi from '../../lib/api/goals';
import * as memoryApi from '../../lib/api/memory';

jest.mock('../../lib/api/goals');
jest.mock('../../lib/api/journeys');
jest.mock('../../lib/api/milestones');
jest.mock('../../lib/api/tasks');
jest.mock('../../lib/api/memory');
jest.mock('../../lib/api/conversations');

let mockPathname = '/conversation';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
const mockedGoals = goalsApi as jest.Mocked<typeof goalsApi>;
const mockedMemory = memoryApi as jest.Mocked<typeof memoryApi>;

function SignedInAs({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (session.roles.length === 0 && roles.length > 0) {
    setSession({
      ...session,
      isAuthenticated: true,
      accessToken: 'token-123',
      memberId: 'user-1',
      roles,
    });
  }
  return <>{children}</>;
}

function renderShell(roles: string[] = []) {
  return render(
    <SessionProvider>
      <JourneyProvider>
        <MemoryProvider>
          <ConversationProvider>
            <SignedInAs roles={roles}>
              <AppShell>
                <p>Content</p>
              </AppShell>
            </SignedInAs>
          </ConversationProvider>
        </MemoryProvider>
      </JourneyProvider>
    </SessionProvider>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockPathname = '/conversation';
    mockedGoals.listGoals.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
    mockedMemory.getMyMemory.mockResolvedValue({
      goals: [],
      activeJourney: null,
      savedOpportunities: [],
      savedResources: [],
      podMemberships: [],
      stewardshipRelationship: null,
      recentConversationSnippets: [],
    });
  });

  it('keeps navigation quiet until the member opens the Hall index', async () => {
    renderShell();
    expect(screen.queryByRole('link', { name: 'Journey' })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /index/i }));
    expect(screen.getByRole('link', { name: 'Conversation' })).toHaveAttribute(
      'href',
      '/conversation',
    );
    expect(screen.getByRole('link', { name: 'Journey' })).toHaveAttribute('href', '/journey');
    expect(screen.getByRole('link', { name: 'Documents' })).toHaveAttribute('href', '/documents');
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('announces the current room and marks the current route', async () => {
    mockPathname = '/journey';
    renderShell();
    expect(screen.getByText('The Path')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /index/i }));
    expect(screen.getByRole('link', { name: 'Journey' })).toHaveAttribute('aria-current', 'page');
  });

  it('makes ambient sound opt-in and remembers the choice', async () => {
    renderShell();
    const sound = screen.getByRole('button', { name: 'Sound off' });
    await userEvent.setup().click(sound);
    expect(sound).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('aureus-hall-sound')).toBe('on');
  });

  it('only shows the Founder destination to an administrator', async () => {
    renderShell(['PLATFORM_ADMINISTRATOR']);
    await userEvent.setup().click(screen.getByRole('button', { name: /index/i }));
    expect(screen.getByRole('link', { name: 'Founder' })).toHaveAttribute('href', '/founder');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderShell(['MEMBER']);
    expect(await axe(container)).toHaveNoViolations();
  });
});
