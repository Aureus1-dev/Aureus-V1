import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { ConversationProvider, useConversation } from './ConversationContext';
import * as conversationsApi from '../../lib/api/conversations';
import { ApiError, NetworkError } from '../../lib/api/errors';

jest.mock('../../lib/api/conversations');

const mockedApi = conversationsApi as jest.Mocked<typeof conversationsApi>;

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useConversation> & { setToken: (t: string | null) => void }) => void }) {
  const conversation = useConversation();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...conversation,
      setToken: (token: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId: token ? 'member-1' : null }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useConversation> & { setToken: (t: string | null) => void };
  render(
    <SessionProvider>
      <ConversationProvider>
        <Harness onReady={(value) => (api = value)} />
      </ConversationProvider>
    </SessionProvider>,
  );
  return () => api;
}

describe('ConversationContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a conversation on the first submitted message and appends the reply in order', async () => {
    mockedApi.createConversation.mockResolvedValue({
      id: 'conv-1',
      userId: 'member-1',
      title: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    mockedApi.sendMessage.mockResolvedValue({
      id: 'msg-assistant-1',
      conversationId: 'conv-1',
      role: 'ASSISTANT',
      content: 'It sounds like you want to get started.',
      createdAt: '2026-01-01T00:00:01Z',
    });

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    act(() => getApi().setDraft('Hello, I need help.'));
    await act(async () => {
      await getApi().sendMessage();
    });

    expect(mockedApi.createConversation).toHaveBeenCalledWith('token-123');
    expect(mockedApi.sendMessage).toHaveBeenCalledWith('token-123', 'conv-1', 'Hello, I need help.');

    const timeline = getApi().timeline;
    expect(timeline).toHaveLength(2);
    expect(timeline[0].role).toBe('USER');
    expect(timeline[0].content).toBe('Hello, I need help.');
    expect(timeline[1].role).toBe('ASSISTANT');
    expect(getApi().state.draft).toBe('');
    expect(getApi().state.pendingResponse).toBe(false);
  });

  it('loads an existing conversation and its message history when selected', async () => {
    mockedApi.listMessages.mockResolvedValue([
      { id: 'm1', conversationId: 'conv-9', role: 'USER', content: 'Hi', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'm2', conversationId: 'conv-9', role: 'ASSISTANT', content: 'Hello there.', createdAt: '2026-01-01T00:00:01Z' },
    ]);

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().selectConversation('conv-9');
    });

    expect(mockedApi.listMessages).toHaveBeenCalledWith('token-123', 'conv-9');
    expect(getApi().timeline.map((m) => m.content)).toEqual(['Hi', 'Hello there.']);
  });

  it('refreshMessages always refetches, unlike selectConversation which trusts its cache (text ↔ voice continuity)', async () => {
    mockedApi.listMessages
      .mockResolvedValueOnce([{ id: 'm1', conversationId: 'conv-9', role: 'USER', content: 'Hi', createdAt: '2026-01-01T00:00:00Z' }])
      .mockResolvedValueOnce([
        { id: 'm1', conversationId: 'conv-9', role: 'USER', content: 'Hi', createdAt: '2026-01-01T00:00:00Z' },
        { id: 'm2', conversationId: 'conv-9', role: 'ASSISTANT', content: 'Spoken by voice.', createdAt: '2026-01-01T00:00:01Z' },
      ]);

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().selectConversation('conv-9');
    });
    expect(getApi().timeline).toHaveLength(1);

    // A second selectConversation would be a no-op (cached); refreshMessages is not.
    await act(async () => {
      await getApi().refreshMessages('conv-9');
    });

    expect(mockedApi.listMessages).toHaveBeenCalledTimes(2);
    expect(getApi().timeline.map((m) => m.content)).toEqual(['Hi', 'Spoken by voice.']);
  });

  it('loads paginated conversation history', async () => {
    mockedApi.listConversations.mockResolvedValue({
      data: [{ id: 'conv-1', userId: 'member-1', title: 'First', createdAt: 'x', updatedAt: 'x' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    await act(async () => {
      await getApi().loadConversations();
    });

    expect(getApi().state.conversations).toHaveLength(1);
    expect(getApi().state.conversationsMeta).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it('prevents a duplicate send while a response is pending', async () => {
    let resolveSend!: (value: conversationsApi.MessageDto) => void;
    mockedApi.createConversation.mockResolvedValue({
      id: 'conv-1',
      userId: 'member-1',
      title: null,
      createdAt: 'x',
      updatedAt: 'x',
    });
    mockedApi.sendMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        }),
    );

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    act(() => getApi().setDraft('First message'));

    let firstSend!: Promise<void>;
    act(() => {
      firstSend = getApi().sendMessage();
    });
    expect(getApi().state.pendingResponse).toBe(true);

    await act(async () => {
      await getApi().sendMessage();
    });
    expect(mockedApi.sendMessage).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSend({ id: 'reply', conversationId: 'conv-1', role: 'ASSISTANT', content: 'Reply', createdAt: 'x' });
      await firstSend;
    });
    expect(getApi().state.pendingResponse).toBe(false);
  });

  it('restores the draft and reports a retryable error on 503', async () => {
    mockedApi.createConversation.mockRejectedValue(new ApiError(503, 'The AI service is temporarily unavailable'));

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    act(() => getApi().setDraft('Please help me plan.'));
    await act(async () => {
      await getApi().sendMessage();
    });

    expect(getApi().state.draft).toBe('Please help me plan.');
    expect(getApi().state.error).toEqual({
      kind: 'unavailable',
      message: 'The AI service is temporarily unavailable',
      retryable: true,
    });
    expect(getApi().timeline).toHaveLength(0);
  });

  it('reports a non-retryable rate-limit error distinctly', async () => {
    mockedApi.createConversation.mockRejectedValue(new ApiError(429, 'Too many requests'));

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    act(() => getApi().setDraft('One more thing.'));
    await act(async () => {
      await getApi().sendMessage();
    });

    expect(getApi().state.error?.kind).toBe('rate-limited');
    expect(getApi().state.error?.retryable).toBe(true);
  });

  it('requires authentication before sending and never calls the API unauthenticated', async () => {
    const getApi = renderHarness();
    act(() => getApi().setDraft('Hello?'));
    await act(async () => {
      await getApi().sendMessage();
    });

    expect(mockedApi.createConversation).not.toHaveBeenCalled();
    expect(getApi().state.error?.kind).toBe('authentication');
    expect(getApi().state.error?.retryable).toBe(false);
    expect(getApi().state.draft).toBe('Hello?');
  });

  it('classifies a network failure as retryable', async () => {
    mockedApi.createConversation.mockRejectedValue(new NetworkError());

    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    act(() => getApi().setDraft('Testing connectivity'));
    await act(async () => {
      await getApi().sendMessage();
    });

    expect(getApi().state.error).toEqual({
      kind: 'network',
      message: 'The network request could not be completed.',
      retryable: true,
    });
  });

  it('does not send a message consisting only of whitespace', async () => {
    const getApi = renderHarness();
    act(() => getApi().setToken('token-123'));
    act(() => getApi().setDraft('   '));
    await act(async () => {
      await getApi().sendMessage();
    });

    expect(mockedApi.createConversation).not.toHaveBeenCalled();
  });
});
