import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { ConversationProvider } from '../../../state/conversation/ConversationContext';
import { VoiceProvider } from '../../../state/voice/VoiceContext';
import { VoiceSurface } from './VoiceSurface';
import * as voiceApi from '../../../lib/api/voice';
import * as conversationsApi from '../../../lib/api/conversations';
import {
  VoiceWebRtcClient,
  type VoiceWebRtcClientCallbacks,
} from '../../../lib/voice/webrtc-client';
import { ApiError } from '../../../lib/api/errors';

jest.mock('../../../lib/api/voice');
jest.mock('../../../lib/api/conversations');
jest.mock('../../../lib/voice/webrtc-client');

const mockedVoiceApi = voiceApi as jest.Mocked<typeof voiceApi>;
const mockedConversationsApi = conversationsApi as jest.Mocked<typeof conversationsApi>;
const MockedClient = VoiceWebRtcClient as jest.MockedClass<typeof VoiceWebRtcClient>;

const voiceSession = {
  id: 'vs-1',
  conversationId: 'conv-1',
  clientSecret: 'secret',
  expiresAt: 'x',
  model: 'gpt-realtime',
  voice: 'marin',
  turnDetectionMode: 'semantic_vad',
  startedAt: 'x',
  endedAt: null,
};

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  const signedIn = session.isAuthenticated;
  if (!signedIn) {
    setSession({
      ...session,
      isAuthenticated: true,
      accessToken: 'token-123',
      memberId: 'member-1',
    });
  }
  return <>{children}</>;
}

function renderSurface(
  { signedIn = true, onClose }: { signedIn?: boolean; onClose?: () => void } = {},
) {
  return render(
    <SessionProvider>
      <ConversationProvider>
        <VoiceProvider>
          {signedIn ? (
            <SignedInAs>
              <VoiceSurface onClose={onClose} />
            </SignedInAs>
          ) : (
            <VoiceSurface onClose={onClose} />
          )}
        </VoiceProvider>
      </ConversationProvider>
    </SessionProvider>,
  );
}

function lastCallbacks(): VoiceWebRtcClientCallbacks {
  const call = MockedClient.mock.calls[MockedClient.mock.calls.length - 1];
  return call[0];
}

describe('VoiceSurface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVoiceApi.startVoiceSession.mockResolvedValue(voiceSession);
    mockedVoiceApi.syncVoiceEvents.mockResolvedValue({ messages: [], turnEvents: [] });
    mockedVoiceApi.endVoiceSession.mockResolvedValue({
      id: 'vs-1',
      conversationId: 'conv-1',
      startedAt: 'x',
      endedAt: 'y',
      endReason: 'MEMBER_ENDED',
    });
    mockedConversationsApi.listMessages.mockResolvedValue([]);
  });

  it('prompts sign-in when not authenticated, without starting a session', () => {
    renderSurface({ signedIn: false });
    expect(screen.getByText('Sign in to talk with your steward')).toBeInTheDocument();
    expect(mockedVoiceApi.startVoiceSession).not.toHaveBeenCalled();
  });

  it('never requests the microphone until the member explicitly starts', () => {
    renderSurface();
    expect(mockedVoiceApi.startVoiceSession).not.toHaveBeenCalled();
    expect(MockedClient).not.toHaveBeenCalled();
  });

  it('starts a session on explicit member action and shows the live controls once connected', async () => {
    renderSurface();
    await userEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));

    expect(mockedVoiceApi.startVoiceSession).toHaveBeenCalledWith('token-123', undefined);
    expect(await screen.findByRole('button', { name: 'End conversation' })).toBeInTheDocument();
    expect(screen.getByText('Listening…')).toBeInTheDocument();
  });

  it('displays a finalized member turn in the live transcript', async () => {
    renderSurface();
    await userEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));
    await screen.findByRole('button', { name: 'End conversation' });

    lastCallbacks().onDataChannelMessage({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'item-1',
      transcript: 'What is a Journey?',
    });

    expect(await screen.findByText('What is a Journey?')).toBeInTheDocument();
  });

  it('toggles mute from the controls', async () => {
    renderSurface();
    await userEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));
    await screen.findByRole('button', { name: 'End conversation' });

    const muteButton = screen.getByRole('button', { name: /mute/i });
    await userEvent.click(muteButton);

    expect(MockedClient.prototype.setMuted).toHaveBeenCalledWith(true);
  });

  it('ends the session, refreshes the shared conversation, and offers a way back to text', async () => {
    renderSurface();
    await userEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));
    await screen.findByRole('button', { name: 'End conversation' });

    await userEvent.click(screen.getByRole('button', { name: 'End conversation' }));

    expect(await screen.findByText('Conversation ended')).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedConversationsApi.listMessages).toHaveBeenCalledWith('token-123', 'conv-1'),
    );
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('shows calm recovery choices when the voice service is unavailable', async () => {
    const onClose = jest.fn();
    mockedVoiceApi.startVoiceSession.mockRejectedValue(new ApiError(503, 'unavailable'));
    renderSurface({ onClose });
    await userEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));

    expect(await screen.findByText('Voice is temporarily unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try voice again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue by typing' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Continue by typing' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the exit control hidden for the entire retry round trip', async () => {
    renderSurface();
    await userEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));
    await screen.findByRole('button', { name: 'End conversation' });

    lastCallbacks().onConnectionStateChange('failed');
    expect(await screen.findByText('The voice connection was interrupted')).toBeInTheDocument();

    let resolveRetry!: (value: typeof voiceSession) => void;
    const pendingRetry = new Promise<typeof voiceSession>((resolve) => {
      resolveRetry = resolve;
    });
    mockedVoiceApi.startVoiceSession.mockImplementationOnce(() => pendingRetry);

    await userEvent.click(screen.getByRole('button', { name: 'Try voice again' }));

    await waitFor(() =>
      expect(mockedVoiceApi.endVoiceSession).toHaveBeenCalledWith('token-123', 'vs-1'),
    );
    await waitFor(() => expect(mockedVoiceApi.startVoiceSession).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Reconnecting voice')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();

    resolveRetry(voiceSession);
    expect(await screen.findByRole('button', { name: 'End conversation' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations before a session starts', async () => {
    const { container } = renderSurface();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations once connected', async () => {
    const { container } = renderSurface();
    await userEvent.click(screen.getByRole('button', { name: 'Start voice conversation' }));
    await screen.findByRole('button', { name: 'End conversation' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
