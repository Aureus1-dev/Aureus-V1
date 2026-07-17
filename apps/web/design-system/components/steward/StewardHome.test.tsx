import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { HighlightRegistryProvider } from '../../../state/highlight/HighlightRegistryContext';
import { ConversationProvider } from '../../../state/conversation/ConversationContext';
import { RecommendationsProvider } from '../../../state/recommendations/RecommendationsContext';
import { StewardHome } from './StewardHome';
import * as conversationsApi from '../../../lib/api/conversations';
import * as recommendationsApi from '../../../lib/api/recommendations';

jest.mock('../../../lib/api/conversations');
jest.mock('../../../lib/api/recommendations');

const mockedConversations = conversationsApi as jest.Mocked<typeof conversationsApi>;
const mockedRecommendations = recommendationsApi as jest.Mocked<typeof recommendationsApi>;

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderPage({ signedIn = true }: { signedIn?: boolean } = {}) {
  return render(
    <SessionProvider>
      <HighlightRegistryProvider>
        <ConversationProvider>
          <RecommendationsProvider>
            {signedIn ? (
              <SignedInAs>
                <StewardHome />
              </SignedInAs>
            ) : (
              <StewardHome />
            )}
          </RecommendationsProvider>
        </ConversationProvider>
      </HighlightRegistryProvider>
    </SessionProvider>,
  );
}

describe('StewardHome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRecommendations.listRecommendations.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  it('asks a signed-out visitor to sign in', () => {
    renderPage({ signedIn: false });
    expect(screen.getByText('Sign in to reach your Steward')).toBeInTheDocument();
  });

  it('lets a member ask a question and see the reply, without leaving the page', async () => {
    mockedConversations.createConversation.mockResolvedValue({ id: 'conv-1', userId: 'member-1', title: null, createdAt: 'x', updatedAt: 'x' });
    mockedConversations.sendMessage.mockResolvedValue({
      id: 'msg-1', conversationId: 'conv-1', role: 'ASSISTANT', content: 'A Journey tracks progress toward a Goal.', createdAt: 'x',
    });

    renderPage();

    await userEvent.type(screen.getByRole('textbox'), 'What is a Journey?');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('A Journey tracks progress toward a Goal.')).toBeInTheDocument();
  });

  it('shows pending decisions', async () => {
    mockedRecommendations.listRecommendations.mockResolvedValue({
      data: [{
        id: 'rec-1', userId: 'member-1', opportunityId: null, resourceId: null, courseId: null, podId: null,
        rationale: 'This matches your goal.', status: 'PENDING', decidedAt: null, createdAt: 'x',
      }],
      total: 1, page: 1, limit: 20, totalPages: 1,
    });

    renderPage();

    expect(await screen.findByText('This matches your goal.')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderPage();
    await screen.findByText('Nothing needs your decision right now.');
    expect(await axe(container)).toHaveNoViolations();
  });
});
