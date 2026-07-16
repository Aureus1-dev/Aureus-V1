import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { VoiceProvider, useVoice } from '../../../state/voice/VoiceContext';
import { PersistentVoicePresence } from './PersistentVoicePresence';
import * as voiceApi from '../../../lib/api/voice';
import { VoiceWebRtcClient, type VoiceWebRtcClientCallbacks } from '../../../lib/voice/webrtc-client';

jest.mock('../../../lib/api/voice');
jest.mock('../../../lib/voice/webrtc-client');

let mockPathname = '/home';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));

const mockedApi = voiceApi as jest.Mocked<typeof voiceApi>;
const MockedClient = VoiceWebRtcClient as jest.MockedClass<typeof VoiceWebRtcClient>;

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function VoiceHarness({ onReady }: { onReady: (startSession: () => Promise<void>) => void }) {
  const { startSession } = useVoice();
  useEffect(() => {
    onReady(() => startSession());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSession]);
  return null;
}

async function renderConnectedPresence() {
  let start!: () => Promise<void>;
  const view = render(
    <SessionProvider>
      <VoiceProvider>
        <SignedInAs>
          <PersistentVoicePresence />
          <VoiceHarness onReady={(s) => (start = s)} />
        </SignedInAs>
      </VoiceProvider>
    </SessionProvider>,
  );
  await act(async () => start());
  return view;
}

function lastCallbacks(): VoiceWebRtcClientCallbacks {
  const call = MockedClient.mock.calls[MockedClient.mock.calls.length - 1];
  return call[0];
}

describe('PersistentVoicePresence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/home';
    mockedApi.startVoiceSession.mockResolvedValue({
      id: 'vs-1', conversationId: 'conv-1', clientSecret: 'secret', expiresAt: 'x',
      model: 'gpt-4o-realtime-preview', voice: 'alloy', turnDetectionMode: 'semantic_vad', startedAt: 'x', endedAt: null,
    });
    mockedApi.syncVoiceEvents.mockResolvedValue({ messages: [], turnEvents: [] });
    mockedApi.endVoiceSession.mockResolvedValue({ id: 'vs-1', conversationId: 'conv-1', startedAt: 'x', endedAt: 'y', endReason: 'MEMBER_ENDED' });
  });

  it('renders nothing when no voice session is live', () => {
    render(
      <SessionProvider>
        <VoiceProvider>
          <PersistentVoicePresence />
        </VoiceProvider>
      </SessionProvider>,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders nothing on the /conversation screen itself, where the full VoiceSurface already shows this', async () => {
    mockPathname = '/conversation';
    await renderConnectedPresence();
    expect(screen.queryByText('Listening…')).not.toBeInTheDocument();
  });

  it('shows the presence widget with a link back to the conversation once connected, on any other screen', async () => {
    mockPathname = '/journey';
    await renderConnectedPresence();

    expect(screen.getByText('Listening…')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open conversation' })).toHaveAttribute('href', '/conversation');
  });

  it('mute toggles via the same control the full VoiceSurface uses', async () => {
    mockPathname = '/journey';
    await renderConnectedPresence();

    await userEvent.click(screen.getByRole('button', { name: /Mute/ }));
    expect(MockedClient.prototype.setMuted).toHaveBeenCalledWith(true);
  });

  it('shows Interrupt only while the steward is speaking', async () => {
    mockPathname = '/journey';
    await renderConnectedPresence();
    expect(screen.queryByRole('button', { name: /Interrupt/ })).not.toBeInTheDocument();

    const callbacks = lastCallbacks();
    act(() => callbacks.onDataChannelMessage({ type: 'response.created', response: { id: 'resp-1' } }));
    act(() => callbacks.onDataChannelMessage({ type: 'response.audio_transcript.delta', response_id: 'resp-1', delta: 'Hello' }));

    expect(screen.getByRole('button', { name: /Interrupt/ })).toBeInTheDocument();
  });

  it('End ends the session', async () => {
    mockPathname = '/journey';
    await renderConnectedPresence();

    await userEvent.click(screen.getByRole('button', { name: /^End/ }));
    expect(mockedApi.endVoiceSession).toHaveBeenCalledWith('token-123', 'vs-1');
  });

  it('has no accessibility violations', async () => {
    mockPathname = '/journey';
    const { container } = await renderConnectedPresence();
    expect(await axe(container)).toHaveNoViolations();
  });
});
