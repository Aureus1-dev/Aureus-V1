import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { MessagesProvider, useMessages } from './MessagesContext';
import * as messagesApi from '../../lib/api/messages';
import { ApiError } from '../../lib/api/errors';
import type { ConversationDto, MessageDto } from '../../lib/api/messages';

jest.mock('../../lib/api/messages');

const mockedApi = messagesApi as jest.Mocked<typeof messagesApi>;

function makeConversation(o: Partial<ConversationDto> = {}): ConversationDto {
  return {
    id: 'conv-1', type: 'STEWARDSHIP', relationshipId: 'rel-1', organizationId: null,
    lastMessageAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z', ...o,
  };
}

function makeMessage(o: Partial<MessageDto> = {}): MessageDto {
  return {
    id: 'msg-1', conversationId: 'conv-1', senderId: 'member-1', body: 'Hello', status: 'SENT',
    createdAt: '2026-01-01T00:00:00Z', ...o,
  };
}

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useMessages> & { setToken: (t: string | null) => void }) => void }) {
  const messages = useMessages();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...messages,
      setToken: (token: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId: token ? 'member-1' : null }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useMessages> & { setToken: (t: string | null) => void };
  render(
    <SessionProvider>
      <MessagesProvider>
        <Harness onReady={(value) => (api = value)} />
      </MessagesProvider>
    </SessionProvider>,
  );
  return () => api;
}

describe('MessagesContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads conversations', async () => {
    mockedApi.listConversations.mockResolvedValue({ data: [makeConversation()], total: 1, page: 1, limit: 20, totalPages: 1 });
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadConversations());

    expect(mockedApi.listConversations).toHaveBeenCalledWith('token-123');
    expect(getApi().state.conversations).toHaveLength(1);
  });

  it('loads messages for a conversation', async () => {
    mockedApi.listMessages.mockResolvedValue({ data: [makeMessage()], total: 1, page: 1, limit: 100, totalPages: 1 });
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadMessages('conv-1'));

    expect(mockedApi.listMessages).toHaveBeenCalledWith('token-123', 'conv-1', { limit: 100 });
    expect(getApi().state.messagesByConversationId['conv-1']).toHaveLength(1);
  });

  it('sends a message and appends it to the thread', async () => {
    mockedApi.sendMessage.mockResolvedValue(makeMessage({ id: 'msg-2', body: 'Hi there' }));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    await act(async () => getApi().send('conv-1', 'Hi there'));

    expect(mockedApi.sendMessage).toHaveBeenCalledWith('token-123', 'conv-1', 'Hi there');
    expect(getApi().state.messagesByConversationId['conv-1']).toHaveLength(1);
  });

  it('marks a conversation read', async () => {
    mockedApi.markConversationRead.mockResolvedValue({ success: true });
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));

    await act(async () => getApi().markRead('conv-1'));

    expect(mockedApi.markConversationRead).toHaveBeenCalledWith('token-123', 'conv-1');
  });

  it('classifies an error and clears it on request', async () => {
    mockedApi.listConversations.mockRejectedValue(new ApiError(401, 'Sign in required'));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().loadConversations());

    expect(getApi().state.error?.kind).toBe('authentication');
    act(() => getApi().clearError());
    expect(getApi().state.error).toBeNull();
  });

  it('requires authentication before loading conversations', async () => {
    const getApi = renderHarness();
    await act(async () => getApi().loadConversations());
    expect(mockedApi.listConversations).not.toHaveBeenCalled();
  });
});
