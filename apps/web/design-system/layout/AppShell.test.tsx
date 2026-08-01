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
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'user-1', roles });
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
              {/* Chrome only: `<main>` moved into the Hall (`HallStage`),
                  so the shell no longer wraps the application's content. */}
              <AppShell />
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
    mockPathname = '/conversation';
    mockedGoals.listGoals.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    mockedMemory.getMyMemory.mockResolvedValue({
      goals: [], activeJourney: null, savedOpportunities: [], savedResources: [],
      podMemberships: [], stewardshipRelationship: null, recentConversationSnippets: [],
    });
  });

  it('always shows the 8 curated primary-tier surfaces', () => {
    renderShell();
    expect(screen.getByRole('link', { name: 'Conversation' })).toHaveAttribute('href', '/conversation');
    expect(screen.getByRole('link', { name: 'Journey' })).toHaveAttribute('href', '/journey');
    expect(screen.getByRole('link', { name: 'Plans' })).toHaveAttribute('href', '/plans');
    expect(screen.getByRole('link', { name: 'Opportunities' })).toHaveAttribute('href', '/opportunities');
    expect(screen.getByRole('link', { name: 'Documents' })).toHaveAttribute('href', '/documents');
    expect(screen.getByRole('link', { name: 'Community' })).toHaveAttribute('href', '/community');
    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/calendar');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });

  it('collapses every other surface behind a "More" disclosure, closed by default, still fully reachable once expanded', async () => {
    renderShell();
    const user = userEvent.setup();

    const disclosure = screen.getByText('More').closest('details');
    expect(disclosure).not.toHaveAttribute('open');

    await user.click(screen.getByText('More'));

    // Nothing was removed — every secondary surface is still a real, working link.
    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/home');
    expect(screen.getByRole('link', { name: 'Steward' })).toHaveAttribute('href', '/steward');
  });

  it('marks the current route with aria-current="page"', () => {
    mockPathname = '/journey';
    renderShell();
    expect(screen.getByRole('link', { name: 'Journey' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Conversation' })).not.toHaveAttribute('aria-current');
  });

  it('does not show the Founder link for a member', async () => {
    renderShell(['MEMBER']);
    const user = userEvent.setup();
    await user.click(screen.getByText('More'));
    expect(screen.queryByRole('link', { name: 'Founder' })).not.toBeInTheDocument();
  });

  it('does not show Academy or Pods (C2 — cut for V1: "No Pods, no Academy")', async () => {
    renderShell();
    const user = userEvent.setup();
    await user.click(screen.getByText('More'));
    expect(screen.queryByRole('link', { name: 'Academy' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pods' })).not.toBeInTheDocument();
  });

  it('shows the Founder link for a Platform Administrator', async () => {
    renderShell(['PLATFORM_ADMINISTRATOR']);
    const user = userEvent.setup();
    await user.click(screen.getByText('More'));
    expect(screen.getByRole('link', { name: 'Founder' })).toHaveAttribute('href', '/founder');
  });

  it('shows the Founder link for a System Administrator', async () => {
    renderShell(['SYSTEM_ADMINISTRATOR']);
    const user = userEvent.setup();
    await user.click(screen.getByText('More'));
    expect(screen.getByRole('link', { name: 'Founder' })).toHaveAttribute('href', '/founder');
  });

  it('has no accessibility violations without the Founder nav entry', async () => {
    const { container } = renderShell(['MEMBER']);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations with the Founder nav entry', async () => {
    const { container } = renderShell(['PLATFORM_ADMINISTRATOR']);
    expect(await axe(container)).toHaveNoViolations();
  });
});
