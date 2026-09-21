import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import type {
  ResponsibilityDto,
  ResponsibilityEventDto,
  ResponsibilityStatus,
} from '../../../lib/api/responsibilities';
import { ActiveWorkSurface } from './ActiveWorkSurface';
import { buildCarryState } from './responsibility-carry-state';

function event(
  toStatus: ResponsibilityStatus,
  occurredAt: string,
  type = 'STATE_CHANGED',
): ResponsibilityEventDto {
  return {
    id: `${type}-${occurredAt}`,
    type,
    actorClass: 'AUREUS',
    actorUserId: null,
    fromStatus: 'ACTIVE',
    toStatus,
    sourceSystem: null,
    sourceRecordType: null,
    sourceRecordId: null,
    sourceState: null,
    evidenceLevel: null,
    occurredAt,
  };
}

function makeResponsibility(
  overrides: Partial<ResponsibilityDto> = {},
): ResponsibilityDto {
  return {
    id: 'responsibility-1',
    kind: 'PERSONAL_NEED_RESOLUTION',
    objective: 'Keep my housing stable',
    status: 'WAITING_ON_USER',
    contextType: 'PERSONAL',
    authorityClass: 'GUIDANCE_ONLY',
    authorityPolicyVersion: 'personal-guidance-v1',
    privacyScope: 'PERSONAL_PRIVATE',
    privacyPolicyVersion: 'personal-private-v1',
    originConversationId: 'conversation-1',
    originOpportunityId: null,
    successCriteria: { type: 'PERSONAL_NEED_RESOLUTION' },
    dueAt: null,
    retentionExpiresAt: null,
    completedAt: null,
    createdAt: '2026-09-20T12:00:00.000Z',
    updatedAt: '2026-09-21T12:00:00.000Z',
    events: [],
    ...overrides,
  };
}

function renderCarry(
  responsibility: ResponsibilityDto,
  hasActiveGuideSession = false,
  onResume?: () => void,
) {
  const carryState = buildCarryState(responsibility, hasActiveGuideSession);
  if (!carryState) throw new Error('expected carry state');
  return render(<ActiveWorkSurface {...carryState} onResume={onResume} />);
}

describe('UI-005 Asking', () => {
  it('shows one sourced member ask with reason, continuation, and alternate route', () => {
    renderCarry(
      makeResponsibility({
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: {
            version: 'people-step5-obligation-v1',
            owner: 'MEMBER',
            requiredAction: 'Upload the requested proof of income.',
            dueAt: '2026-09-24T17:00:00.000Z',
            dueProvenance: 'REPORTED',
            state: 'PENDING',
            lastAttemptAt: null,
            nextAttemptAt: null,
            reportedSatisfiedAt: null,
            verifiedSatisfiedAt: null,
            reviewRequired: false,
          },
        },
      }),
    );

    const asking = screen.getByRole('region', { name: 'What Aureus needs from you' });
    expect(within(asking).getByText('I need one thing from you')).toBeInTheDocument();
    expect(within(asking).getByText('Upload the requested proof of income.')).toBeInTheDocument();
    expect(within(asking).getByText('Why I need it')).toBeInTheDocument();
    expect(within(asking).getByText('Then I’ll')).toBeInTheDocument();
    expect(within(asking).getByText('If you can’t')).toBeInTheDocument();

    expect(screen.queryByRole('region', { name: 'Waiting' })).not.toBeInTheDocument();
    expect(screen.queryByText('Next action')).not.toBeInTheDocument();
  });

  it('does not invent a full ask from coarse WAITING_ON_USER status alone', () => {
    renderCarry(makeResponsibility());

    expect(
      screen.queryByRole('region', { name: 'What Aureus needs from you' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Needs you')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Aureus needs something from you to continue — return to the conversation for details.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Waiting' })).toBeInTheDocument();
  });

  it('does not turn disputed or review-required Step-5 truth into a member ask', () => {
    renderCarry(
      makeResponsibility({
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: {
            version: 'people-step5-obligation-v1',
            owner: 'MEMBER',
            requiredAction: 'Upload a replacement lease page.',
            dueAt: '2026-09-24T17:00:00.000Z',
            dueProvenance: 'VERIFIED',
            state: 'DISPUTED',
            lastAttemptAt: '2026-09-21T14:00:00.000Z',
            nextAttemptAt: null,
            reportedSatisfiedAt: null,
            verifiedSatisfiedAt: null,
            reviewRequired: true,
          },
        },
      }),
    );

    expect(
      screen.queryByRole('region', { name: 'What Aureus needs from you' }),
    ).not.toBeInTheDocument();
  });

  it('does not resurrect a satisfied Step-5 request as an ask', () => {
    renderCarry(
      makeResponsibility({
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: {
            version: 'people-step5-obligation-v1',
            owner: 'MEMBER',
            requiredAction: 'Upload the requested proof of income.',
            dueAt: '2026-09-24T17:00:00.000Z',
            dueProvenance: 'REPORTED',
            state: 'SATISFIED_REPORTED',
            lastAttemptAt: null,
            nextAttemptAt: null,
            reportedSatisfiedAt: '2026-09-21T15:00:00.000Z',
            verifiedSatisfiedAt: null,
            reviewRequired: false,
          },
        },
      }),
    );

    expect(
      screen.queryByRole('region', { name: 'What Aureus needs from you' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Upload the requested proof of income.')).not.toBeInTheDocument();
    expect(screen.queryByText('Needs you')).not.toBeInTheDocument();
  });

  it('honors a later member wait without reusing the satisfied Step-5 request', () => {
    renderCarry(
      makeResponsibility({
        updatedAt: '2026-09-21T16:00:00.000Z',
        events: [event('WAITING_ON_USER', '2026-09-21T16:00:00.000Z', 'USER_INPUT_REQUIRED')],
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: {
            version: 'people-step5-obligation-v1',
            owner: 'MEMBER',
            requiredAction: 'Upload the old proof of income.',
            dueAt: '2026-09-24T17:00:00.000Z',
            dueProvenance: 'REPORTED',
            state: 'SATISFIED_REPORTED',
            lastAttemptAt: null,
            nextAttemptAt: null,
            reportedSatisfiedAt: '2026-09-21T15:00:00.000Z',
            verifiedSatisfiedAt: null,
            reviewRequired: false,
          },
        },
      }),
    );

    expect(screen.getByRole('region', { name: 'Waiting' })).toBeInTheDocument();
    expect(screen.getByText('Needs you')).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'What Aureus needs from you' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Upload the old proof of income.')).not.toBeInTheDocument();
  });

  it('explains the application-guide ask and the authority reason before resume', () => {
    const onResume = jest.fn();
    renderCarry(
      makeResponsibility({
        kind: 'OPPORTUNITY_APPLICATION_GUIDANCE',
        objective: 'Apply for the verified housing program',
        status: 'ACTIVE',
        originOpportunityId: 'opportunity-1',
        successCriteria: { type: 'APPLICATION_GUIDANCE_MEMBER_OUTCOME_RECORDED' },
      }),
      false,
      onResume,
    );

    const asking = screen.getByRole('region', { name: 'What Aureus needs from you' });
    expect(within(asking).getByText('Resume the application when you are ready.')).toBeInTheDocument();
    expect(
      within(asking).getByText(
        'Only you can enter private information, attest to it, and submit this application. I cannot do those steps for you.',
      ),
    ).toBeInTheDocument();
    expect(within(asking).getByRole('button', { name: 'Continue with Aureus' })).toBeInTheDocument();
    expect(screen.queryByText('Next action')).not.toBeInTheDocument();
  });

  it('does not show a resume ask while the application guide is already active', () => {
    renderCarry(
      makeResponsibility({
        kind: 'OPPORTUNITY_APPLICATION_GUIDANCE',
        objective: 'Apply for the verified housing program',
        status: 'ACTIVE',
        originOpportunityId: 'opportunity-1',
        successCriteria: { type: 'APPLICATION_GUIDANCE_MEMBER_OUTCOME_RECORDED' },
      }),
      true,
    );

    expect(
      screen.queryByRole('region', { name: 'What Aureus needs from you' }),
    ).not.toBeInTheDocument();
  });

  it('has no accessibility violations for a fully structured ask', async () => {
    const { container } = renderCarry(
      makeResponsibility({
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: {
            version: 'people-step5-obligation-v1',
            owner: 'MEMBER',
            requiredAction: 'Confirm the current mailing address.',
            dueAt: '2026-09-24T17:00:00.000Z',
            dueProvenance: 'VERIFIED',
            state: 'WAITING',
            lastAttemptAt: null,
            nextAttemptAt: null,
            reportedSatisfiedAt: null,
            verifiedSatisfiedAt: null,
            reviewRequired: false,
          },
        },
      }),
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
