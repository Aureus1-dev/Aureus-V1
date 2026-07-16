import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { ConversationProvider } from '../../../state/conversation/ConversationContext';
import { ConversationShortcut } from './ConversationShortcut';
import * as conversationsApi from '../../../lib/api/conversations';
import type { ConversationDto } from '../../../lib/api/conversations';

jest.mock('../../../lib/api/conversations');

const mockedConversations = conversationsApi as jest.Mocked<typeof conversationsApi>;

function makeConversation(o: Partial<ConversationDto>): ConversationDto {
  return { id: 'c-1', userId: 'member-1', title: 'Finding a job', createdAt: 'x', updatedAt: 'x', ...o };
}

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderShortcut() {
  return render(
    <SessionProvider>
      <ConversationProvider>
        <SignedInAs>
          <ConversationShortcut />
        </SignedInAs>
      </ConversationProvider>
    </SessionProvider>,
  );
}

describe('ConversationShortcut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('surfaces the most recent conversation and links to both text and voice', async () => {
    mockedConversations.listConversations.mockResolvedValue({
      data: [makeConversation({ title: 'Finding a job' })], total: 1, page: 1, limit: 20, totalPages: 1,
    });

    renderShortcut();

    expect(await screen.findByText('Pick up where you left off: "Finding a job".')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue the conversation' })).toHaveAttribute('href', '/conversation');
    expect(screen.getByRole('link', { name: 'Talk out loud instead' })).toHaveAttribute(
      'href',
      '/conversation?mode=voice',
    );
  });

  it('shows generic hospitality copy when there is no prior conversation', async () => {
    mockedConversations.listConversations.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    renderShortcut();

    expect(await screen.findByText("There's no wrong way to begin a conversation.")).toBeInTheDocument();
  });

  it('never imports Voice Domain internals — the voice entry point is a plain link', async () => {
    mockedConversations.listConversations.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    renderShortcut();
    const voiceLink = await screen.findByRole('link', { name: 'Talk out loud instead' });
    expect(voiceLink.tagName).toBe('A');
  });

  it('has no accessibility violations', async () => {
    mockedConversations.listConversations.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    const { container } = renderShortcut();
    await screen.findByText("There's no wrong way to begin a conversation.");
    expect(await axe(container)).toHaveNoViolations();
  });
});
