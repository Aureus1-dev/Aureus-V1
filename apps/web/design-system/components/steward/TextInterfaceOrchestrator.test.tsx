import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { ConversationProvider, useConversation } from '../../../state/conversation/ConversationContext';
import { HighlightRegistryProvider, useRegisterHighlightTarget } from '../../../state/highlight/HighlightRegistryContext';
import { InterfaceProvider, useInterfaceState } from '../../../state/interface/InterfaceContext';
import { TextInterfaceOrchestrator } from './TextInterfaceOrchestrator';
import * as conversationsApi from '../../../lib/api/conversations';
import type { MessageDto } from '../../../lib/api/conversations';

jest.mock('../../../lib/api/conversations');

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const mockedApi = conversationsApi as jest.Mocked<typeof conversationsApi>;

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

function OpenPanelIds() {
  const { interfaceState } = useInterfaceState();
  return <div data-testid="open-panels">{interfaceState.openPanelIds.join(',')}</div>;
}

function AskHarness({ onReady }: { onReady: (value: ReturnType<typeof useConversation>) => void }) {
  const conversation = useConversation();
  useEffect(() => {
    onReady(conversation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation]);
  return null;
}

function makeAssistantReply(toolCalls?: MessageDto['toolCalls']): MessageDto {
  return {
    id: 'msg-1', conversationId: 'conv-1', role: 'ASSISTANT', content: 'Here you go.', createdAt: 'x', toolCalls,
  };
}

async function renderAndAsk(toolCalls?: MessageDto['toolCalls']) {
  mockedApi.createConversation.mockResolvedValue({ id: 'conv-1', userId: 'member-1', title: null, createdAt: 'x', updatedAt: 'x' });
  mockedApi.sendMessage.mockResolvedValue(makeAssistantReply(toolCalls));

  let api!: ReturnType<typeof useConversation>;
  render(
    <SessionProvider>
      <InterfaceProvider>
        <HighlightRegistryProvider>
          <ConversationProvider>
            <SignedInAs>
              <TargetButton id="Home.NextMission" label="Your next mission" />
              <OpenPanelIds />
              <TextInterfaceOrchestrator />
              <AskHarness onReady={(value) => (api = value)} />
            </SignedInAs>
          </ConversationProvider>
        </HighlightRegistryProvider>
      </InterfaceProvider>
    </SessionProvider>,
  );

  act(() => api.setDraft('Take me to my journey'));
  await act(async () => {
    await api.sendMessage();
  });
}

describe('TextInterfaceOrchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates for a navigate_to_route tool call requested by a text response', async () => {
    await renderAndAsk([{ id: 'call-1', name: 'navigate_to_route', arguments: '{"route":"journey"}' }]);
    expect(push).toHaveBeenCalledWith('/journey');
  });

  it('highlights a registered target for focus_interface_target', async () => {
    await renderAndAsk([{ id: 'call-1', name: 'focus_interface_target', arguments: '{"targetId":"Home.NextMission"}' }]);
    expect(screen.getByText('Your next mission')).toHaveAttribute('data-active', 'true');
  });

  it('opens the Steward Workspace panel for open_panel', async () => {
    await renderAndAsk([{ id: 'call-1', name: 'open_panel', arguments: '{"panelId":"steward-workspace"}' }]);
    expect(screen.getByTestId('open-panels')).toHaveTextContent('steward-workspace');
  });

  it('does nothing when the response carries no tool calls', async () => {
    await renderAndAsk(undefined);
    expect(push).not.toHaveBeenCalled();
  });

  it('rejects an out-of-allow-list route without navigating', async () => {
    await renderAndAsk([{ id: 'call-1', name: 'navigate_to_route', arguments: '{"route":"admin-panel"}' }]);
    expect(push).not.toHaveBeenCalled();
  });
});
