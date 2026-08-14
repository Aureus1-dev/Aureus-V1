import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import {
  resumePublicWardConversation,
  sendPublicWardMessage,
  startPublicWardConversation,
} from '../../../lib/api/public-ward';
import { PublicWardExperience } from './PublicWardExperience';

jest.mock('../../../lib/api/public-ward', () => ({
  resumePublicWardConversation: jest.fn(),
  sendPublicWardMessage: jest.fn(),
  startPublicWardConversation: jest.fn(),
}));

const mockStart = startPublicWardConversation as jest.MockedFunction<typeof startPublicWardConversation>;
const mockResume = resumePublicWardConversation as jest.MockedFunction<typeof resumePublicWardConversation>;
const mockSend = sendPublicWardMessage as jest.MockedFunction<typeof sendPublicWardMessage>;

const started = {
  conversationId: 'conversation-1',
  accessToken: 'opaque-token',
  tokenExpiresAt: '2026-08-14T12:00:00.000Z',
  expiresAt: '2026-08-20T12:00:00.000Z',
  status: 'OPEN' as const,
  remainingTurns: 20,
  profile: {
    slug: 'example-kitchens',
    name: 'Example Kitchens',
    description: 'Kitchen remodeling.',
    websiteUrl: 'https://example.com',
    serviceArea: { cities: ['Philadelphia'] },
    businessHours: { summary: 'Weekdays' },
    contactRoutes: [{ type: 'PHONE' as const, value: '+1 215 555 0100' }],
    notice: 'Approved information only.',
  },
  messages: [{
    id: 'opening',
    role: 'WARD' as const,
    content: 'How can we help?',
    responseKind: 'OPENING' as const,
    createdAt: '2026-08-13T12:00:00.000Z',
    sources: [],
  }],
};

describe('PublicWardExperience', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    jest.clearAllMocks();
    mockStart.mockResolvedValue(started);
  });

  it('opens account-free with a direct human route and no sign-in gate', async () => {
    const { container } = render(<PublicWardExperience slug="example-kitchens" />);

    expect(await screen.findByRole('heading', { name: 'Example Kitchens' })).toBeInTheDocument();
    expect(screen.getAllByText('How can we help?')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Call a person' })).toHaveAttribute(
      'href',
      'tel:+1 215 555 0100',
    );
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/create account/i)).not.toBeInTheDocument();
    expect(screen.getByText(/No Aureus account is required/i)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders the exact approved-source attribution returned with an answer', async () => {
    mockSend.mockResolvedValue({
      conversationId: started.conversationId,
      status: 'OPEN',
      remainingTurns: 19,
      humanContact: started.profile.contactRoutes[0],
      visitorMessage: {
        id: 'visitor-1',
        role: 'VISITOR',
        content: 'Do you install cabinets?',
        responseKind: null,
        createdAt: '2026-08-13T12:01:00.000Z',
        sources: [],
      },
      message: {
        id: 'ward-1',
        role: 'WARD',
        content: 'We install cabinets [S1].',
        responseKind: 'GROUNDED',
        createdAt: '2026-08-13T12:01:01.000Z',
        sources: [{
          title: 'Cabinet installation',
          url: 'https://example.com/cabinets',
          reviewedAt: '2026-08-13T00:00:00.000Z',
        }],
      },
    });

    render(<PublicWardExperience slug="example-kitchens" />);
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Example Kitchens' });
    await user.type(screen.getByLabelText('How can we help?'), 'Do you install cabinets?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('We install cabinets [S1].')).toBeInTheDocument();
    expect(screen.getByText('1 approved source')).toBeInTheDocument();
    await user.click(screen.getByText('1 approved source'));
    expect(screen.getByRole('link', { name: 'Cabinet installation' })).toHaveAttribute(
      'href',
      'https://example.com/cabinets',
    );
    expect(mockSend).toHaveBeenCalledWith(
      'example-kitchens',
      'conversation-1',
      'opaque-token',
      'Do you install cabinets?',
    );
  });

  it('resumes only with the tab-scoped opaque token', async () => {
    window.sessionStorage.setItem('aureus:ward:example-kitchens', JSON.stringify({
      conversationId: 'conversation-1',
      accessToken: 'opaque-token',
    }));
    mockResume.mockResolvedValue(started);

    render(<PublicWardExperience slug="example-kitchens" embedded />);
    await waitFor(() => expect(mockResume).toHaveBeenCalledWith(
      'example-kitchens',
      'conversation-1',
      'opaque-token',
    ));
    expect(mockStart).not.toHaveBeenCalled();
  });
});
