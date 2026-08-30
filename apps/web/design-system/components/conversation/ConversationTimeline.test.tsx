import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ConversationTimeline } from './ConversationTimeline';
import type { VirtualTimelineEntry } from './build-virtual-timeline';
import type { MessageDto } from '../../../lib/api/conversations';
import type { CoordinatedPlanDto } from '../../../lib/api/plan';
import type { GoalDto } from '../../../lib/api/goals';
import type { DocumentDto } from '../../../lib/api/documents';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const messages: MessageDto[] = [
  { id: '1', conversationId: 'c1', role: 'USER', content: 'Old question', createdAt: '2026-01-01T00:00:00Z' },
  { id: '2', conversationId: 'c1', role: 'ASSISTANT', content: 'Old answer.', createdAt: '2026-01-01T00:00:01Z' },
  { id: '3', conversationId: 'c1', role: 'USER', content: 'Current question', createdAt: '2026-01-01T00:00:02Z' },
  { id: '4', conversationId: 'c1', role: 'ASSISTANT', content: 'Current answer.', createdAt: '2026-01-01T00:00:03Z' },
];

const messageEntries: VirtualTimelineEntry[] = messages.map((message) => ({
  key: 'message:' + message.id,
  type: 'message',
  timestamp: message.createdAt,
  message,
}));

const recommendation = {
  id: 'rec-1', userId: 'member-1', opportunityId: 'opp-1', resourceId: null, courseId: null, podId: null,
  rationale: 'This matches your goal.', status: 'PENDING' as const, decidedAt: null, createdAt: 'x',
};

const plan: CoordinatedPlanDto = {
  primary: { source: 'RECOMMENDATION', recommendation, cityResource: null, categoryLabel: 'Opportunity' },
  supporting: [],
  combinedRationale: 'Opportunity is the strongest real option available right now.',
  additionalPossibilitiesCount: 0,
};

const goal: GoalDto = {
  id: 'goal-1', title: 'Find a better job', status: 'ACTIVE', userId: 'member-1', createdAt: 'x', updatedAt: 'x', deletedAt: null,
};

const document: DocumentDto = {
  id: 'doc-1', documentRef: null, userId: 'member-1', title: 'Lease Agreement', originalFilename: 'lease.pdf',
  mimeType: 'application/pdf', sizeBytes: 100, storageRef: 'ref', category: 'LEASE', extractedText: 'Full lease text.',
  aiSummary: null, aiSummaryGeneratedAt: null, uploadedAt: 'x', updatedAt: 'x',
};

const opportunityAction = {
  opportunityId: 'opp-1',
  opportunityRef: 'AUR-OPP-000001',
  title: 'Rental Assistance',
  provider: 'City Program',
  url: 'https://example.com/apply',
  canonicalUrl: 'https://example.com/apply',
  referralUrl: null,
  affiliateDisclosure: null,
  eligibility: 'Published eligibility',
  geography: 'Philadelphia',
  payoutNotes: null,
  timeToCashNotes: null,
  status: 'verified' as const,
  lastVerifiedAt: '2026-08-30T00:00:00Z',
  sourceName: 'Official city source',
  sourceUrl: 'https://example.com',
  sourceType: 'ADMIN_ENTRY' as const,
};

const defaultProps = {
  planSubjectsById: {},
  planOfferResponseByCityResourceId: {},
  isDecidingPlanItem: () => false,
  onApprovePlanItem: jest.fn(),
  onDismissPlanItem: jest.fn(),
};

describe('ConversationTimeline — living conversation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps only the latest exchange in the live foreground', () => {
    render(<ConversationTimeline entries={messageEntries} pendingResponse={false} {...defaultProps} />);
    expect(screen.getByText('Current question')).toBeInTheDocument();
    expect(screen.getByText('Current answer.')).toBeInTheDocument();
    expect(screen.queryByText('Old question')).not.toBeInTheDocument();
    expect(screen.queryByText('Old answer.')).not.toBeInTheDocument();
  });

  it('shows only the new member caption plus an honest working state while pending', () => {
    render(<ConversationTimeline entries={messageEntries.slice(0, 3)} pendingResponse={true} {...defaultProps} />);
    expect(screen.getByText('Current question')).toBeInTheDocument();
    expect(screen.queryByText('Old answer.')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: /working on your request/i })).toBeInTheDocument();
  });

  it('keeps a server-verified opportunity as durable work after its prose ages out', () => {
    const withAction: VirtualTimelineEntry[] = [
      ...messageEntries.slice(0, 2),
      {
        key: 'message:action',
        type: 'message',
        timestamp: '2026-01-01T00:00:01.500Z',
        message: {
          id: 'action',
          conversationId: 'c1',
          role: 'ASSISTANT',
          content: 'I found a verified action.',
          createdAt: '2026-01-01T00:00:01.500Z',
          opportunityAction,
        },
      },
      ...messageEntries.slice(2),
    ];
    render(<ConversationTimeline entries={withAction} pendingResponse={false} {...defaultProps} />);
    expect(screen.queryByText('I found a verified action.')).not.toBeInTheDocument();
    expect(screen.getByText('Rental Assistance')).toBeInTheDocument();
    expect(screen.getByText(/Verified action ready · Official city source/i)).toBeInTheDocument();
  });

  it('shows only allow-listed completed interface receipts and never raw arguments', () => {
    const entries: VirtualTimelineEntry[] = [{
      key: 'message:tool',
      type: 'message',
      timestamp: 'x',
      message: {
        id: 'tool',
        conversationId: 'c1',
        role: 'ASSISTANT',
        content: 'Here you go.',
        createdAt: 'x',
        toolCalls: [
          { id: 'call-1', name: 'navigate_to_route', arguments: '{"route":"opportunities","secret":"never-render"}' },
          { id: 'call-2', name: 'unknown_tool', arguments: '{"value":"also-never-render"}' },
        ],
      },
    }];
    render(<ConversationTimeline entries={entries} pendingResponse={false} {...defaultProps} />);
    expect(screen.getByText('Opened Opportunities')).toBeInTheDocument();
    expect(screen.queryByText(/never-render/)).not.toBeInTheDocument();
    expect(screen.queryByText(/also-never-render/)).not.toBeInTheDocument();
  });

  it('renders a plan as persistent work and preserves the existing approval callback', async () => {
    const onApprove = jest.fn();
    const entries: VirtualTimelineEntry[] = [{ key: 'plan:recommendation:rec-1', type: 'plan', timestamp: 'x', plan }];
    render(<ConversationTimeline entries={entries} pendingResponse={false} {...defaultProps} onApprovePlanItem={onApprove} />);
    expect(screen.getByText('Plan ready')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onApprove).toHaveBeenCalledWith(plan.primary);
  });

  it('keeps journey and document results in the work stage', async () => {
    const entries: VirtualTimelineEntry[] = [
      { key: 'journey-update:goal-1', type: 'journey-update', timestamp: 'x', goal },
      { key: 'document:doc-1', type: 'document', timestamp: 'y', document },
    ];
    render(<ConversationTimeline entries={entries} pendingResponse={false} {...defaultProps} />);
    expect(screen.getByText('Journey updated')).toBeInTheDocument();
    expect(screen.getByText('Document ready')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View progress' }));
    expect(push).toHaveBeenCalledWith('/journey');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ConversationTimeline entries={messageEntries} pendingResponse={false} {...defaultProps} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
