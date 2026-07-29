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
  { id: '1', conversationId: 'c1', role: 'USER', content: 'Hello', createdAt: '2026-01-01T00:00:00Z' },
  { id: '2', conversationId: 'c1', role: 'ASSISTANT', content: 'Hi there.', createdAt: '2026-01-01T00:00:01Z' },
];

const messageEntries: VirtualTimelineEntry[] = messages.map((message) => ({
  key: `message:${message.id}`,
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

const defaultProps = {
  planSubjectsById: {},
  planOfferResponseByCityResourceId: {},
  isDecidingPlanItem: () => false,
  onApprovePlanItem: jest.fn(),
  onDismissPlanItem: jest.fn(),
};

describe('ConversationTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders messages in order with an accessible log role — the regression guard for plain conversations', () => {
    render(<ConversationTimeline entries={messageEntries} pendingResponse={false} {...defaultProps} />);
    const log = screen.getByRole('log');
    expect(log.children).toHaveLength(2);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there.')).toBeInTheDocument();
  });

  it('shows the thinking indicator after the last entry while a response is pending', () => {
    render(<ConversationTimeline entries={messageEntries} pendingResponse={true} {...defaultProps} />);
    expect(screen.getByRole('status', { name: /thinking/i })).toBeInTheDocument();
  });

  it('renders an inline plan entry and routes approve/dismiss through the passed-in callbacks — never re-implements approval', async () => {
    const onApprove = jest.fn();
    const entries: VirtualTimelineEntry[] = [{ key: 'plan:recommendation:rec-1', type: 'plan', timestamp: 'x', plan }];
    render(<ConversationTimeline entries={entries} pendingResponse={false} {...defaultProps} onApprovePlanItem={onApprove} />);

    expect(screen.getByText('This matches your goal.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onApprove).toHaveBeenCalledWith(plan.primary);
  });

  it('renders an inline journey-update entry that navigates to /journey on open', async () => {
    const entries: VirtualTimelineEntry[] = [{ key: 'journey-update:goal-1', type: 'journey-update', timestamp: 'x', goal }];
    render(<ConversationTimeline entries={entries} pendingResponse={false} {...defaultProps} />);

    expect(screen.getByText('Find a better job')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View progress' }));
    expect(push).toHaveBeenCalledWith('/journey');
  });

  it('renders an inline document entry collapsed, expanding to the full text in place rather than navigating away', async () => {
    const entries: VirtualTimelineEntry[] = [{ key: 'document:doc-1', type: 'document', timestamp: 'x', document }];
    render(<ConversationTimeline entries={entries} pendingResponse={false} {...defaultProps} />);

    expect(screen.getByText('Lease Agreement')).toBeInTheDocument();
    expect(screen.queryByText('Full lease text.')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'View full text' }));
    expect(screen.getByText('Full lease text.')).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ConversationTimeline entries={messageEntries} pendingResponse={false} {...defaultProps} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
