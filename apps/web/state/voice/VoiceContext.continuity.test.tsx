import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { VoiceProvider, useVoice } from './VoiceContext';
import * as voiceApi from '../../lib/api/voice';
import { VoiceWebRtcClient, type VoiceWebRtcClientCallbacks } from '../../lib/voice/webrtc-client';

jest.mock('../../lib/api/voice');
jest.mock('../../lib/voice/webrtc-client');

const mockedApi = voiceApi as jest.Mocked<typeof voiceApi>;
const MockedClient = VoiceWebRtcClient as jest.MockedClass<typeof VoiceWebRtcClient>;

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useVoice> & { signIn: () => void }) => void }) {
  const voice = useVoice();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...voice,
      signIn: () =>
        setSession({
          ...session,
          isAuthenticated: true,
          accessToken: 'token-123',
          memberId: 'member-1',
        }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useVoice> & { signIn: () => void };
  render(
    <SessionProvider>
      <VoiceProvider>
        <Harness onReady={(value) => (api = value)} />
      </VoiceProvider>
    </SessionProvider>,
  );
  return () => api;
}

function lastCallbacks(): VoiceWebRtcClientCallbacks {
  return MockedClient.mock.calls[MockedClient.mock.calls.length - 1][0];
}

describe('VoiceContext canonical continuity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.startVoiceSession.mockResolvedValue({
      id: 'vs-1',
      conversationId: 'conv-1',
      clientSecret: 'secret',
      expiresAt: 'x',
      model: 'gpt-realtime',
      voice: 'marin',
      turnDetectionMode: 'semantic_vad',
      startedAt: 'x',
      endedAt: null,
    });
    mockedApi.syncVoiceEvents.mockResolvedValue({ messages: [], turnEvents: [] });
    mockedApi.endVoiceSession.mockResolvedValue({
      id: 'vs-1',
      conversationId: 'conv-1',
      startedAt: 'x',
      endedAt: 'y',
      endReason: 'MEMBER_ENDED',
    });
  });

  async function connected() {
    const getApi = renderHarness();
    await act(async () => getApi().signIn());
    await act(async () => getApi().startSession());
    return getApi;
  }

  it('requeues a finalized voice turn after a transient sync failure and retries it on End', async () => {
    mockedApi.syncVoiceEvents
      .mockRejectedValueOnce(new Error('temporary sync failure'))
      .mockResolvedValue({ messages: [], turnEvents: [] });

    const getApi = await connected();
    const callbacks = lastCallbacks();

    act(() =>
      callbacks.onDataChannelMessage({
        type: 'conversation.item.input_audio_transcription.completed',
        item_id: 'item-1',
        transcript: 'My water bill is late and being shut off',
      }),
    );
    await act(async () => {});

    expect(mockedApi.syncVoiceEvents).toHaveBeenCalledTimes(1);
    expect(getApi().state.transcript).toEqual([
      expect.objectContaining({
        role: 'member',
        content: 'My water bill is late and being shut off',
        status: 'final',
      }),
    ]);

    await act(async () => getApi().endSession());

    expect(mockedApi.syncVoiceEvents).toHaveBeenCalledTimes(2);
    expect(mockedApi.syncVoiceEvents.mock.calls[1][2]).toEqual({
      turnEvents: [expect.objectContaining({ type: 'MEMBER_TURN_FINALIZED', providerItemId: 'item-1' })],
      messages: [
        {
          role: 'USER',
          content: 'My water bill is late and being shut off',
          providerItemId: 'item-1',
        },
      ],
      usage: [],
    });
    expect(mockedApi.endVoiceSession).toHaveBeenCalledWith('token-123', 'vs-1');
  });

  it('does not turn an intentional End into a false connection-lost error', async () => {
    const getApi = await connected();
    const callbacks = lastCallbacks();

    await act(async () => getApi().endSession());
    act(() => callbacks.onConnectionStateChange('closed'));

    expect(getApi().state.turnState).toBe('ended');
    expect(getApi().state.error).toBeNull();
  });
});
