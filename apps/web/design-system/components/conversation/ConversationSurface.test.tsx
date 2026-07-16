import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { ConversationProvider } from '../../../state/conversation/ConversationContext';
import { VoiceProvider } from '../../../state/voice/VoiceContext';
import { ConversationSurface } from './ConversationSurface';
import * as conversationsApi from '../../../lib/api/conversations';
import * as voiceApi from '../../../lib/api/voice';
import { ApiError } from '../../../lib/api/errors';

jest.mock('../../../lib/api/conversations');
jest.mock('../../../lib/api/voice');
jest.mock('../../../lib/voice/webrtc-client');

const mockedApi = conversationsApi as jest.Mocked<typeof conversationsApi>;
const mockedVoiceApi = voiceApi as jest.Mocked<typeof voiceApi>;

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  const signedIn = session.isAuthenticated;
  if (!signedIn) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderSurface({ signedIn = true }: { signedIn?: boolean } = {}) {
  return render(
    <SessionProvider>
      <ConversationProvider>
        <VoiceProvider>
          {signedIn ? (
            <SignedInAs>
              <ConversationSurface />
            </SignedInAs>
          ) : (
            <ConversationSurface />
          )}
        </VoiceProvider>
      </ConversationProvider>
    </SessionProvider>,
  );
}

describe('ConversationSurface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.listConversations.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  it('prompts sign-in when the member is not authenticated, without calling the API', () => {
    renderSurface({ signedIn: false });
    expect(screen.getByText('Sign in to talk with your steward')).toBeInTheDocument();
    expect(mockedApi.listConversations).not.toHaveBeenCalled();
  });

  it('shows an empty state before any message has been sent', async () => {
    renderSurface();
    expect(await screen.findByText("Share what's on your mind")).toBeInTheDocument();
  });

  it('sends a message end-to-end and displays the exchange', async () => {
    mockedApi.createConversation.mockResolvedValue({
      id: 'conv-1',
      userId: 'member-1',
      title: null,
      createdAt: 'x',
      updatedAt: 'x',
    });
    mockedApi.sendMessage.mockResolvedValue({
      id: 'reply-1',
      conversationId: 'conv-1',
      role: 'ASSISTANT',
      content: 'It sounds like you want to get started.',
      createdAt: 'x',
    });

    renderSurface();
    const textarea = await screen.findByLabelText('Message your steward');
    await userEvent.type(textarea, 'Hello, I need help.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByText('Hello, I need help.')).toBeInTheDocument());
    expect(await screen.findByText('It sounds like you want to get started.')).toBeInTheDocument();
  });

  it('shows a calm, retryable error state and preserves the draft on 503', async () => {
    mockedApi.createConversation.mockRejectedValue(new ApiError(503, 'The AI service is temporarily unavailable'));

    renderSurface();
    const textarea = await screen.findByLabelText('Message your steward');
    await userEvent.type(textarea, 'Please help me plan.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Your steward is temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toBe('Please help me plan.');
  });

  it('has no accessibility violations in its default authenticated state', async () => {
    const { container } = renderSurface();
    await screen.findByText("Share what's on your mind");
    expect(await axe(container)).toHaveNoViolations();
  });

  it('switches to voice mode on the same conversation, and back — text ↔ voice continuity', async () => {
    mockedApi.createConversation.mockResolvedValue({
      id: 'conv-1', userId: 'member-1', title: null, createdAt: 'x', updatedAt: 'x',
    });
    mockedApi.sendMessage.mockResolvedValue({
      id: 'reply-1', conversationId: 'conv-1', role: 'ASSISTANT', content: 'Hello.', createdAt: 'x',
    });
    mockedVoiceApi.startVoiceSession.mockResolvedValue({
      id: 'vs-1', conversationId: 'conv-1', clientSecret: 'secret', expiresAt: 'x',
      model: 'gpt-4o-realtime-preview', voice: 'alloy', turnDetectionMode: 'semantic_vad', startedAt: 'x', endedAt: null,
    });

    renderSurface();
    const textarea = await screen.findByLabelText('Message your steward');
    await userEvent.type(textarea, 'Hello, I need help.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByText('Hello.')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Talk' }));
    expect(screen.getByRole('button', { name: 'Start voice conversation' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));

    // The same conversation is continued by voice, not a new one.
    expect(mockedVoiceApi.startVoiceSession).toHaveBeenCalledWith('token-123', 'conv-1');

    await userEvent.click(screen.getByRole('button', { name: 'Type' }));
    expect(await screen.findByText('Hello.')).toBeInTheDocument();
  });
});
