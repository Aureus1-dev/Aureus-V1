import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { VoiceProvider, useVoice } from './VoiceContext';
import * as voiceApi from '../../lib/api/voice';
import { VoiceWebRtcClient, type VoiceWebRtcClientCallbacks } from '../../lib/voice/webrtc-client';
import { ApiError } from '../../lib/api/errors';

jest.mock('../../lib/api/voice');
jest.mock('../../lib/voice/webrtc-client');

const mockedApi = voiceApi as jest.Mocked<typeof voiceApi>;
const MockedClient = VoiceWebRtcClient as jest.MockedClass<typeof VoiceWebRtcClient>;

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useVoice> & { setToken: (t: string | null) => void }) => void }) {
  const voice = useVoice();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...voice,
      setToken: (token: string | null) =>
        setSession({ ...session, isAuthenticated: !!token, accessToken: token, memberId: token ? 'member-1' : null }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useVoice> & { setToken: (t: string | null) => void };
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
  const call = MockedClient.mock.calls[MockedClient.mock.calls.length - 1];
  return call[0];
}

describe('VoiceContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.startVoiceSession.mockResolvedValue({
      id: 'vs-1', conversationId: 'conv-1', clientSecret: 'secret', expiresAt: 'x',
      model: 'gpt-4o-realtime-preview', voice: 'alloy', turnDetectionMode: 'semantic_vad', startedAt: 'x', endedAt: null,
    });
    mockedApi.syncVoiceEvents.mockResolvedValue({ messages: [], turnEvents: [] });
    mockedApi.endVoiceSession.mockResolvedValue({ id: 'vs-1', conversationId: 'conv-1', startedAt: 'x', endedAt: 'y', endReason: 'MEMBER_ENDED' });
  });

  async function signedInAndConnected() {
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().startSession());
    return getApi;
  }

  it('requires sign-in before starting a session', async () => {
    const getApi = renderHarness();
    await act(async () => getApi().startSession());

    expect(getApi().state.error?.kind).toBe('authentication');
    expect(mockedApi.startVoiceSession).not.toHaveBeenCalled();
  });

  it('connects to a new session and reaches the listening state', async () => {
    const getApi = await signedInAndConnected();

    expect(getApi().state.turnState).toBe('listening');
    expect(getApi().state.sessionId).toBe('vs-1');
    expect(getApi().state.conversationId).toBe('conv-1');
    expect(MockedClient.prototype.connect).toHaveBeenCalledWith('secret', 'gpt-4o-realtime-preview');
  });

  it('passes an existing conversationId through to continue a text conversation by voice', async () => {
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().startSession('conv-existing'));

    expect(mockedApi.startVoiceSession).toHaveBeenCalledWith('token-123', 'conv-existing');
  });

  it('never advances past listening merely because the member paused (speech-stopped alone)', async () => {
    const getApi = await signedInAndConnected();
    const callbacks = lastCallbacks();

    act(() => callbacks.onDataChannelMessage({ type: 'input_audio_buffer.speech_started' }));
    act(() => callbacks.onDataChannelMessage({ type: 'input_audio_buffer.speech_stopped' }));

    expect(getApi().state.turnState).toBe('listening');
  });

  it('finalizes a member turn, appends the transcript, and syncs it to the backend', async () => {
    const getApi = await signedInAndConnected();
    const callbacks = lastCallbacks();

    act(() => callbacks.onDataChannelMessage({
      type: 'conversation.item.input_audio_transcription.completed', item_id: 'item-1', transcript: 'What is a Journey?',
    }));
    await act(async () => {});

    expect(getApi().state.transcript).toEqual([
      expect.objectContaining({ role: 'member', content: 'What is a Journey?', status: 'final' }),
    ]);
    expect(mockedApi.syncVoiceEvents).toHaveBeenCalledWith('token-123', 'vs-1', {
      turnEvents: [expect.objectContaining({ type: 'MEMBER_TURN_FINALIZED', providerItemId: 'item-1' })],
      messages: [{ role: 'USER', content: 'What is a Journey?', providerItemId: 'item-1' }],
    });
  });

  it('moves through thinking to speaking as the steward responds, then back to listening on completion', async () => {
    const getApi = await signedInAndConnected();
    const callbacks = lastCallbacks();

    act(() => callbacks.onDataChannelMessage({ type: 'response.created', response: { id: 'resp-1' } }));
    expect(getApi().state.turnState).toBe('thinking');

    act(() => callbacks.onDataChannelMessage({ type: 'response.audio_transcript.delta', response_id: 'resp-1', delta: 'A Journey' }));
    expect(getApi().state.turnState).toBe('speaking');
    expect(getApi().state.transcript.find((e) => e.id === 'resp-1')?.content).toBe('A Journey');

    act(() => callbacks.onDataChannelMessage({
      type: 'response.done', response: { id: 'resp-1', status: 'completed', output: [{ id: 'item-2' }] },
    }));
    await act(async () => {});

    expect(getApi().state.turnState).toBe('listening');
    expect(getApi().state.transcript.find((e) => e.id === 'resp-1')?.status).toBe('final');
    expect(mockedApi.syncVoiceEvents).toHaveBeenCalledWith('token-123', 'vs-1', expect.objectContaining({
      messages: [expect.objectContaining({ providerItemId: 'item-2', completionStatus: 'COMPLETE' })],
    }));
  });

  it('marks a barge-in response as interrupted, not complete, and syncs INTERRUPTED accurately', async () => {
    const getApi = await signedInAndConnected();
    const callbacks = lastCallbacks();

    act(() => callbacks.onDataChannelMessage({ type: 'response.created', response: { id: 'resp-1' } }));
    act(() => callbacks.onDataChannelMessage({ type: 'response.audio_transcript.delta', response_id: 'resp-1', delta: 'Here is what I fou' }));
    act(() => callbacks.onDataChannelMessage({
      type: 'response.done', response: { id: 'resp-1', status: 'cancelled', output: [{ id: 'item-2' }] },
    }));
    await act(async () => {});

    expect(getApi().state.transcript.find((e) => e.id === 'resp-1')?.status).toBe('interrupted');
    expect(mockedApi.syncVoiceEvents).toHaveBeenCalledWith('token-123', 'vs-1', expect.objectContaining({
      turnEvents: expect.arrayContaining([expect.objectContaining({ type: 'STEWARD_RESPONSE_INTERRUPTED', providerItemId: 'item-2' })]),
      messages: [expect.objectContaining({ completionStatus: 'INTERRUPTED' })],
    }));
  });

  it('mutes via the WebRTC client without tearing down the session', async () => {
    const getApi = await signedInAndConnected();

    act(() => getApi().setMuted(true));

    expect(getApi().state.muted).toBe(true);
    expect(MockedClient.prototype.setMuted).toHaveBeenCalledWith(true);
    expect(getApi().state.turnState).toBe('listening');
  });

  it('interrupt() delegates to the WebRTC client (the accessible barge-in alternative)', async () => {
    const getApi = await signedInAndConnected();
    act(() => getApi().interrupt());
    expect(MockedClient.prototype.interrupt).toHaveBeenCalled();
  });

  it('ends the session, flushes pending evidence, and tears down the connection', async () => {
    const getApi = await signedInAndConnected();
    const callbacks = lastCallbacks();
    act(() => callbacks.onDataChannelMessage({ type: 'input_audio_buffer.speech_started' }));

    await act(async () => getApi().endSession());

    expect(mockedApi.syncVoiceEvents).toHaveBeenCalled();
    expect(mockedApi.endVoiceSession).toHaveBeenCalledWith('token-123', 'vs-1');
    expect(MockedClient.prototype.disconnect).toHaveBeenCalled();
    expect(getApi().state.turnState).toBe('ended');
  });

  it('surfaces a connection-lost error when the peer connection fails', async () => {
    const getApi = await signedInAndConnected();
    const callbacks = lastCallbacks();

    act(() => callbacks.onConnectionStateChange('failed'));

    expect(getApi().state.error?.kind).toBe('connection');
  });

  it('classifies a service-unavailable broker failure distinctly from a generic error', async () => {
    mockedApi.startVoiceSession.mockRejectedValue(new ApiError(503, 'unavailable'));
    const getApi = renderHarness();
    await act(async () => getApi().setToken('token-123'));
    await act(async () => getApi().startSession());

    expect(getApi().state.error?.kind).toBe('unavailable');
    expect(getApi().state.error?.retryable).toBe(true);
  });
});
