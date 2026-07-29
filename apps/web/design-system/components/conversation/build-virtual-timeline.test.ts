import { buildVirtualTimeline, type BuiltPlan } from './build-virtual-timeline';
import type { MessageDto } from '../../../lib/api/conversations';
import type { GoalDto } from '../../../lib/api/goals';
import type { DocumentDto } from '../../../lib/api/documents';
import type { CoordinatedPlanDto } from '../../../lib/api/plan';

const message = (id: string, role: MessageDto['role'], createdAt: string): MessageDto => ({
  id, conversationId: 'conv-1', role, content: `content-${id}`, createdAt,
});

const goal = (id: string, createdAt: string): GoalDto => ({
  id, title: `Goal ${id}`, status: 'ACTIVE', userId: 'member-1', createdAt, updatedAt: createdAt, deletedAt: null,
});

const document = (id: string, uploadedAt: string): DocumentDto => ({
  id, documentRef: null, userId: 'member-1', title: `Doc ${id}`, originalFilename: 'file.pdf', mimeType: 'application/pdf',
  sizeBytes: 100, storageRef: 'ref', category: 'OTHER', extractedText: null, aiSummary: null, aiSummaryGeneratedAt: null,
  uploadedAt, updatedAt: uploadedAt,
});

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

describe('buildVirtualTimeline', () => {
  it('returns an empty timeline for an empty conversation', () => {
    expect(buildVirtualTimeline([], null, [], [])).toEqual([]);
  });

  it('is a pure pass-through of ordinary messages when there is nothing else to show — the regression guard for plain conversations', () => {
    const messages = [message('1', 'USER', '2026-01-01T00:00:00Z'), message('2', 'ASSISTANT', '2026-01-01T00:00:01Z')];
    const result = buildVirtualTimeline(messages, null, [], []);
    expect(result).toEqual([
      { key: 'message:1', type: 'message', timestamp: '2026-01-01T00:00:00Z', message: messages[0] },
      { key: 'message:2', type: 'message', timestamp: '2026-01-01T00:00:01Z', message: messages[1] },
    ]);
  });

  it('interleaves a plan, a journey update, and a document by real timestamp', () => {
    const messages = [
      message('1', 'USER', '2026-01-01T00:00:00Z'),
      message('2', 'ASSISTANT', '2026-01-01T00:00:05Z'),
    ];
    const builtPlan: BuiltPlan = { plan, builtAt: '2026-01-01T00:00:02Z' };
    const goals = [goal('goal-1', '2026-01-01T00:00:03Z')];
    const documents = [document('doc-1', '2026-01-01T00:00:04Z')];

    const result = buildVirtualTimeline(messages, builtPlan, goals, documents);

    expect(result.map((entry) => entry.key)).toEqual([
      'message:1',
      'plan:recommendation:rec-1',
      'journey-update:goal-1',
      'document:doc-1',
      'message:2',
    ]);
  });

  it('excludes a plan, goal, or document that predates the conversation — never replays the member\'s whole history on every visit', () => {
    const messages = [message('1', 'USER', '2026-01-02T00:00:00Z')];
    const builtPlan: BuiltPlan = { plan, builtAt: '2026-01-01T00:00:00Z' };
    const goals = [goal('goal-old', '2026-01-01T00:00:00Z')];
    const documents = [document('doc-old', '2026-01-01T00:00:00Z')];

    const result = buildVirtualTimeline(messages, builtPlan, goals, documents);

    expect(result).toEqual([{ key: 'message:1', type: 'message', timestamp: '2026-01-02T00:00:00Z', message: messages[0] }]);
  });

  it('shows nothing synthetic before the conversation has its first message, since there is no span to anchor to', () => {
    const builtPlan: BuiltPlan = { plan, builtAt: '2026-01-01T00:00:00Z' };
    const result = buildVirtualTimeline([], builtPlan, [goal('goal-1', '2026-01-01T00:00:00Z')], []);
    expect(result).toEqual([]);
  });

  it('produces stable, non-duplicating keys across repeated calls with the same living state — idempotency', () => {
    const messages = [message('1', 'USER', '2026-01-01T00:00:00Z')];
    const builtPlan: BuiltPlan = { plan, builtAt: '2026-01-01T00:00:01Z' };
    const goals = [goal('goal-1', '2026-01-01T00:00:02Z')];

    const first = buildVirtualTimeline(messages, builtPlan, goals, []);
    const second = buildVirtualTimeline(messages, builtPlan, goals, []);

    expect(first.map((e) => e.key)).toEqual(second.map((e) => e.key));
    expect(new Set(first.map((e) => e.key)).size).toBe(first.length);
  });
});
