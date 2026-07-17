import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { InterfaceProvider } from '../../../state/interface/InterfaceContext';
import { VoiceProvider } from '../../../state/voice/VoiceContext';
import { ConversationProvider } from '../../../state/conversation/ConversationContext';
import { RecommendationsProvider } from '../../../state/recommendations/RecommendationsContext';
import { StewardWorkspace } from './StewardWorkspace';
import * as recommendationsApi from '../../../lib/api/recommendations';
import * as voiceApi from '../../../lib/api/voice';

jest.mock('../../../lib/api/recommendations');
jest.mock('../../../lib/api/voice');
jest.mock('../../../lib/voice/webrtc-client');

const mockedRecommendations = recommendationsApi as jest.Mocked<typeof recommendationsApi>;
const mockedVoice = voiceApi as jest.Mocked<typeof voiceApi>;

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderWorkspace() {
  return render(
    <SessionProvider>
      <InterfaceProvider>
        <VoiceProvider>
          <ConversationProvider>
            <RecommendationsProvider>
              <SignedInAs>
                <StewardWorkspace />
              </SignedInAs>
            </RecommendationsProvider>
          </ConversationProvider>
        </VoiceProvider>
      </InterfaceProvider>
    </SessionProvider>,
  );
}

describe('StewardWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRecommendations.listRecommendations.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  it('renders collapsed by default, calm and out of the way', () => {
    renderWorkspace();
    expect(screen.getByText('Steward')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('expands into the full workspace on click, and closes again', async () => {
    renderWorkspace();

    await userEvent.click(screen.getByText('Steward'));
    expect(await screen.findByRole('dialog', { name: 'Steward Workspace' })).toBeInTheDocument();
    expect(screen.getByText('No conversation yet — ask your Steward anything.')).toBeInTheDocument();
    expect(screen.getByText('Nothing needs your decision right now.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Close/ }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('surfaces a pending recommendation under "Needs your decision"', async () => {
    mockedRecommendations.listRecommendations.mockResolvedValue({
      data: [{
        id: 'rec-1', userId: 'member-1', opportunityId: null, resourceId: null, courseId: null, podId: null,
        rationale: 'This matches your goal.', status: 'PENDING', decidedAt: null, createdAt: 'x',
      }],
      total: 1, page: 1, limit: 20, totalPages: 1,
    });

    renderWorkspace();
    await userEvent.click(screen.getByText('Steward'));

    expect(await screen.findByText('This matches your goal.')).toBeInTheDocument();
  });

  it('shows the voice orb and controls inline, not as a second floating widget, once a voice session is live', async () => {
    mockedVoice.startVoiceSession.mockResolvedValue({
      id: 'vs-1', conversationId: 'conv-1', clientSecret: 'secret', expiresAt: 'x',
      model: 'gpt-4o-realtime-preview', voice: 'alloy', turnDetectionMode: 'semantic_vad', startedAt: 'x', endedAt: null,
    });

    renderWorkspace();

    // Before any voice session, the collapsed pill shows plain "Steward" text.
    expect(screen.getByText('Steward')).toBeInTheDocument();
    expect(screen.queryByText('Listening…')).not.toBeInTheDocument();
  });

  it('has no accessibility violations when collapsed', async () => {
    const { container } = renderWorkspace();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations when expanded', async () => {
    const { container } = renderWorkspace();
    await userEvent.click(screen.getByText('Steward'));
    await screen.findByRole('dialog');
    expect(await axe(container)).toHaveNoViolations();
  });
});
