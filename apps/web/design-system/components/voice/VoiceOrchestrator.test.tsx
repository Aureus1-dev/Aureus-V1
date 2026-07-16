import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { VoiceProvider, useVoice } from '../../../state/voice/VoiceContext';
import { HighlightRegistryProvider, useRegisterHighlightTarget } from '../../../state/highlight/HighlightRegistryContext';
import { VoiceOrchestrator } from './VoiceOrchestrator';
import * as voiceApi from '../../../lib/api/voice';
import { VoiceWebRtcClient, type VoiceWebRtcClientCallbacks } from '../../../lib/voice/webrtc-client';

jest.mock('../../../lib/api/voice');
jest.mock('../../../lib/voice/webrtc-client');

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const mockedApi = voiceApi as jest.Mocked<typeof voiceApi>;
const MockedClient = VoiceWebRtcClient as jest.MockedClass<typeof VoiceWebRtcClient>;

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function TargetButton({ id, label }: { id: string; label: string }) {
  const { ref, isActive } = useRegisterHighlightTarget<HTMLButtonElement>(id, { label });
  return (
    <button ref={ref} data-active={isActive}>
      {label}
    </button>
  );
}

function VoiceHarness({ onReady }: { onReady: (startSession: () => Promise<void>) => void }) {
  const { startSession } = useVoice();
  useEffect(() => {
    onReady(() => startSession());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startSession]);
  return null;
}

async function renderConnectedOrchestrator() {
  let start!: () => Promise<void>;
  render(
    <SessionProvider>
      <HighlightRegistryProvider>
        <VoiceProvider>
          <SignedInAs>
            <TargetButton id="Home.NextMission" label="Your next mission" />
            <VoiceOrchestrator />
            <VoiceHarness onReady={(s) => (start = s)} />
          </SignedInAs>
        </VoiceProvider>
      </HighlightRegistryProvider>
    </SessionProvider>,
  );
  await act(async () => start());
}

function lastCallbacks(): VoiceWebRtcClientCallbacks {
  const call = MockedClient.mock.calls[MockedClient.mock.calls.length - 1];
  return call[0];
}

function requestToolCall(name: string, args: Record<string, unknown>, callId = 'call-1') {
  const callbacks = lastCallbacks();
  act(() => {
    callbacks.onDataChannelMessage({
      type: 'response.done',
      response: {
        id: 'resp-1',
        status: 'completed',
        output: [{ type: 'function_call', call_id: callId, name, arguments: JSON.stringify(args) }],
      },
    });
  });
}

describe('VoiceOrchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.startVoiceSession.mockResolvedValue({
      id: 'vs-1', conversationId: 'conv-1', clientSecret: 'secret', expiresAt: 'x',
      model: 'gpt-4o-realtime-preview', voice: 'alloy', turnDetectionMode: 'semantic_vad', startedAt: 'x', endedAt: null,
    });
    mockedApi.syncVoiceEvents.mockResolvedValue({ messages: [], turnEvents: [] });
  });

  it('navigates to the mapped path for navigate_to_route and reports success back to the provider', async () => {
    await renderConnectedOrchestrator();

    requestToolCall('navigate_to_route', { route: 'journey' });

    expect(push).toHaveBeenCalledWith('/journey');
    expect(MockedClient.prototype.sendEvent).toHaveBeenCalledWith({
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: 'call-1', output: JSON.stringify({ ok: true }) },
    });
    expect(MockedClient.prototype.sendEvent).toHaveBeenCalledWith({ type: 'response.create' });
  });

  it('rejects a route outside the approved allow-list without navigating, even if the model somehow requests one', async () => {
    await renderConnectedOrchestrator();

    requestToolCall('navigate_to_route', { route: 'admin-panel' });

    expect(push).not.toHaveBeenCalled();
    expect(MockedClient.prototype.sendEvent).toHaveBeenCalledWith({
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: 'call-1', output: expect.stringContaining('"ok":false') },
    });
  });

  it('highlights a registered target for focus_interface_target and reports success', async () => {
    await renderConnectedOrchestrator();

    requestToolCall('focus_interface_target', { targetId: 'Home.NextMission' });

    expect(screen.getByText('Your next mission')).toHaveAttribute('data-active', 'true');
    expect(MockedClient.prototype.sendEvent).toHaveBeenCalledWith({
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: 'call-1', output: JSON.stringify({ ok: true }) },
    });
  });

  it('reports failure, without throwing, when asked to highlight a target that is not currently registered', async () => {
    await renderConnectedOrchestrator();

    requestToolCall('focus_interface_target', { targetId: 'Nonexistent.Target' });

    expect(MockedClient.prototype.sendEvent).toHaveBeenCalledWith({
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: 'call-1', output: expect.stringContaining('"ok":false') },
    });
  });

  it('reports failure for an unrecognized tool name rather than crashing', async () => {
    await renderConnectedOrchestrator();

    requestToolCall('delete_everything', {});

    expect(MockedClient.prototype.sendEvent).toHaveBeenCalledWith({
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: 'call-1', output: expect.stringContaining('not a recognized tool') },
    });
  });

  it('reports failure gracefully for malformed tool call arguments', async () => {
    await renderConnectedOrchestrator();
    const callbacks = lastCallbacks();

    act(() => {
      callbacks.onDataChannelMessage({
        type: 'response.done',
        response: {
          id: 'resp-1',
          status: 'completed',
          output: [{ type: 'function_call', call_id: 'call-1', name: 'navigate_to_route', arguments: '{not valid json' }],
        },
      });
    });

    expect(MockedClient.prototype.sendEvent).toHaveBeenCalledWith({
      type: 'conversation.item.create',
      item: { type: 'function_call_output', call_id: 'call-1', output: expect.stringContaining('Could not parse') },
    });
  });

  it('never executes the same tool call twice', async () => {
    await renderConnectedOrchestrator();

    requestToolCall('navigate_to_route', { route: 'home' });
    expect(push).toHaveBeenCalledTimes(1);

    // A second, unrelated re-render (e.g. from an unrelated state change)
    // must not re-execute the already-handled call.
    requestToolCall('navigate_to_route', { route: 'opportunities' }, 'call-2');
    expect(push).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenNthCalledWith(1, '/home');
    expect(push).toHaveBeenNthCalledWith(2, '/opportunities');
  });
});
