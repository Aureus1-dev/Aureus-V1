import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { MessagesProvider } from '../../../state/messages/MessagesContext';
import { MessagesPage } from './MessagesPage';
import * as messagesApi from '../../../lib/api/messages';
import type { ConversationDto, MessageDto } from '../../../lib/api/messages';

jest.mock('../../../lib/api/messages');

const mockedApi = messagesApi as jest.Mocked<typeof messagesApi>;

function makeConversation(o: Partial<ConversationDto> = {}): ConversationDto {
  return {
    id: 'conv-1', type: 'STEWARDSHIP', relationshipId: 'rel-1', organizationId: null,
    lastMessageAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z', ...o,
  };
}

function makeMessage(o: Partial<MessageDto> = {}): MessageDto {
  return {
    id: 'msg-1', conversationId: 'conv-1', senderId: 'member-1', body: 'Hello there', status: 'SENT',
    createdAt: '2026-01-01T00:00:00Z', ...o,
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
      <MessagesProvider>
        <SignedInAs>
          <MessagesPage />
        </SignedInAs>
      </MessagesProvider>
    </SessionProvider>,
  );
}

describe('MessagesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.markConversationRead.mockResolvedValue({ success: true });
  });

  it('renders the conversation list', async () => {
    mockedApi.listConversations.mockResolvedValue({ data: [makeConversation()], total: 1, page: 1, limit: 20, totalPages: 1 });

    renderPage();

    expect(await screen.findByText('Your Steward')).toBeInTheDocument();
  });

  it('shows an empty state when there are no conversations', async () => {
    mockedApi.listConversations.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });

    renderPage();

    expect(await screen.findByText('No conversations yet')).toBeInTheDocument();
  });

  it('opens a conversation, loads its messages, and marks it read', async () => {
    mockedApi.listConversations.mockResolvedValue({ data: [makeConversation()], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockedApi.listMessages.mockResolvedValue({ data: [makeMessage()], total: 1, page: 1, limit: 100, totalPages: 1 });

    renderPage();
    await userEvent.click(await screen.findByText('Your Steward'));

    expect(await screen.findByText('Hello there')).toBeInTheDocument();
    await waitFor(() => expect(mockedApi.markConversationRead).toHaveBeenCalledWith('token-123', 'conv-1'));
  });

  it('sends a message', async () => {
    mockedApi.listConversations.mockResolvedValue({ data: [makeConversation()], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockedApi.listMessages.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100, totalPages: 0 });
    mockedApi.sendMessage.mockResolvedValue(makeMessage({ id: 'msg-2', body: 'Thanks for reaching out' }));

    renderPage();
    await userEvent.click(await screen.findByText('Your Steward'));
    await screen.findByText('No messages yet');

    await userEvent.type(screen.getByPlaceholderText('Write a message...'), 'Thanks for reaching out');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(mockedApi.sendMessage).toHaveBeenCalledWith('token-123', 'conv-1', 'Thanks for reaching out'),
    );
    expect(await screen.findByText('Thanks for reaching out')).toBeInTheDocument();
  });

  it('returns to the conversation list', async () => {
    mockedApi.listConversations.mockResolvedValue({ data: [makeConversation()], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockedApi.listMessages.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100, totalPages: 0 });

    renderPage();
    await userEvent.click(await screen.findByText('Your Steward'));
    await screen.findByText('No messages yet');

    await userEvent.click(screen.getByRole('button', { name: /Back to conversations/i }));

    expect(await screen.findByText('Your Steward')).toBeInTheDocument();
  });

  it('shows a sign-in prompt when unauthenticated', () => {
    render(
      <SessionProvider>
        <MessagesProvider>
          <MessagesPage />
        </MessagesProvider>
      </SessionProvider>,
    );

    expect(screen.getByText('Sign in to view your messages')).toBeInTheDocument();
    expect(mockedApi.listConversations).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    mockedApi.listConversations.mockResolvedValue({ data: [makeConversation()], total: 1, page: 1, limit: 20, totalPages: 1 });
    const { container } = renderPage();
    await screen.findByText('Your Steward');

    expect(await axe(container)).toHaveNoViolations();
  });
});
