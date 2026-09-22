import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import type { ResponsibilityDto } from '../../../lib/api/responsibilities';
import { ActiveWorkSurface } from './ActiveWorkSurface';
import { buildCarryState } from './responsibility-carry-state';

function makeResponsibility(
  overrides: Partial<ResponsibilityDto> = {},
): ResponsibilityDto {
  return {
    id: 'responsibility-recovery-1',
    kind: 'PERSONAL_NEED_RESOLUTION',
    objective: 'Keep my housing stable',
    status: 'ACTIVE',
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
    updatedAt: '2026-09-22T12:00:00.000Z',
    events: [],
    ...overrides,
  };
}

function renderCarry(responsibility: ResponsibilityDto) {
  const carryState = buildCarryState(responsibility);
  if (!carryState) throw new Error('expected carry state');
  return render(<ActiveWorkSurface {...carryState} />);
}

function step5(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    version: 'people-step5-obligation-v1',
    owner: 'MEMBER',
    requiredAction: 'Upload the requested proof of income.',
    dueAt: '2026-09-21T17:00:00.000Z',
    dueProvenance: 'VERIFIED',
    state: 'MISSED',
    lastAttemptAt: '2026-09-21T14:00:00.000Z',
    nextAttemptAt: null,
    reportedSatisfiedAt: null,
    verifiedSatisfiedAt: null,
    reviewRequired: true,
    reviewReason:
      'The current due time passed without evidence that the sourced obligation was satisfied.',
    ...overrides,
  };
}

describe('UI-006 Bad News / Recovering', () => {
  it('shows bounded Responsibility-level BLOCKED recovery without inventing a cause or checkpoint', () => {
    renderCarry(makeResponsibility({ status: 'BLOCKED' }));

    const recovery = screen.getByRole('region', { name: 'Recovery plan' });
    expect(within(recovery).getByText('Here’s what changed')).toBeInTheDocument();
    expect(within(recovery).getByText('The current path is blocked.')).toBeInTheDocument();
    expect(
      within(recovery).getByText('The goal is still open. I have not marked it done.'),
    ).toBeInTheDocument();
    expect(
      within(recovery).getByText('I kept the work visible instead of dropping it.'),
    ).toBeInTheDocument();
    expect(
      within(recovery).getByText('I’m reassessing how to responsibly continue.'),
    ).toBeInTheDocument();
    expect(within(recovery).getByText('Held by')).toBeInTheDocument();
    expect(within(recovery).getByText('Aureus')).toBeInTheDocument();
    expect(within(recovery).queryByText('Next check')).not.toBeInTheDocument();
    expect(screen.queryByText('Next action')).not.toBeInTheDocument();
  });

  it('states responsible exhaustion plainly and does not fabricate a holder, checkpoint, or alternate route', () => {
    renderCarry(makeResponsibility({ status: 'RESPONSIBLY_EXHAUSTED' }));

    const recovery = screen.getByRole('region', { name: 'Recovery plan' });
    expect(
      within(recovery).getByText('I could not find a responsible way to continue this path.'),
    ).toBeInTheDocument();
    expect(within(recovery).getByText('I have not marked the goal as achieved.')).toBeInTheDocument();
    expect(
      within(recovery).getByText('There is no responsible next route recorded right now.'),
    ).toBeInTheDocument();
    expect(within(recovery).queryByText('Held by')).not.toBeInTheDocument();
    expect(within(recovery).queryByText('Next check')).not.toBeInTheDocument();
    expect(screen.queryByText('Needs you')).not.toBeInTheDocument();
  });

  it('uses the canonical missed Step-5 review reason and keeps the underlying need open', () => {
    renderCarry(
      makeResponsibility({
        status: 'WAITING_ON_USER',
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: step5(),
        },
      }),
    );

    const recovery = screen.getByRole('region', { name: 'Recovery plan' });
    expect(
      within(recovery).getByText(
        'The current due time passed without evidence that the sourced obligation was satisfied.',
      ),
    ).toBeInTheDocument();
    expect(
      within(recovery).getByText(
        'The underlying need is still open. This follow-through has not been treated as completed.',
      ),
    ).toBeInTheDocument();
    expect(
      within(recovery).getByText(
        'I kept the underlying need open and marked this follow-through for responsible continuation.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'This follow-through needs a responsible continuation before it can move forward.',
      ),
    ).toBeInTheDocument();

    // The stale coarse WAITING_ON_USER holder must not override recovery truth.
    expect(screen.queryByRole('region', { name: 'Waiting' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'What Aureus needs from you' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Needs you')).not.toBeInTheDocument();
    expect(screen.queryByText('Next action')).not.toBeInTheDocument();
    expect(within(recovery).queryByText('Held by')).not.toBeInTheDocument();
  });

  it('uses disputed due-date truth as recovery and does not mislabel the original obligation owner as recovery holder', () => {
    renderCarry(
      makeResponsibility({
        status: 'WAITING_ON_THIRD_PARTY',
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: step5({
            owner: 'THIRD_PARTY',
            state: 'DISPUTED',
            reviewReason:
              'The member reported a date that differs from the currently verified due date. Aureus preserved the verified date pending source review.',
          }),
        },
      }),
    );

    const recovery = screen.getByRole('region', { name: 'Recovery plan' });
    expect(
      within(recovery).getByText(
        'The member reported a date that differs from the currently verified due date. Aureus preserved the verified date pending source review.',
      ),
    ).toBeInTheDocument();
    expect(
      within(recovery).getByText('I preserved the verified due date while the conflict is reviewed.'),
    ).toBeInTheDocument();
    expect(
      within(recovery).getByText(
        'Review the conflicting due-date truth before this follow-through moves again.',
      ),
    ).toBeInTheDocument();
    expect(within(recovery).queryByText('Held by')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Waiting' })).not.toBeInTheDocument();
  });

  it('shows a real nextAttemptAt as the recovery checkpoint and never relabels dueAt as that checkpoint', () => {
    const dueAt = '2026-09-21T17:00:00.000Z';
    const checkpointAt = '2026-09-23T14:30:00.000Z';
    renderCarry(
      makeResponsibility({
        status: 'BLOCKED',
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: step5({
            state: 'BLOCKED',
            dueAt,
            nextAttemptAt: checkpointAt,
            reviewReason:
              'A recorded follow-through attempt is blocked and needs a responsible continuation route.',
          }),
        },
      }),
    );

    const recovery = screen.getByRole('region', { name: 'Recovery plan' });
    expect(within(recovery).getByText('Next check')).toBeInTheDocument();
    expect(recovery.querySelector(`time[datetime="${checkpointAt}"]`)).not.toBeNull();
    expect(recovery.querySelector(`time[datetime="${dueAt}"]`)).toBeNull();
    expect(screen.queryByRole('region', { name: 'Waiting' })).not.toBeInTheDocument();
  });

  it('does not turn an ordinary wait or a satisfied follow-through into recovery', () => {
    const { unmount } = renderCarry(
      makeResponsibility({ status: 'WAITING_ON_THIRD_PARTY' }),
    );
    expect(screen.queryByRole('region', { name: 'Recovery plan' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Waiting' })).toBeInTheDocument();
    unmount();

    renderCarry(
      makeResponsibility({
        status: 'WAITING_ON_USER',
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: step5({
            state: 'SATISFIED_REPORTED',
            reportedSatisfiedAt: '2026-09-22T13:00:00.000Z',
            reviewRequired: false,
            reviewReason: null,
          }),
        },
      }),
    );
    expect(screen.queryByRole('region', { name: 'Recovery plan' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations for a fully populated recovery plan', async () => {
    const { container } = renderCarry(
      makeResponsibility({
        status: 'BLOCKED',
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: step5({
            state: 'BLOCKED',
            nextAttemptAt: '2026-09-23T14:30:00.000Z',
            reviewReason:
              'A recorded follow-through attempt is blocked and needs a responsible continuation route.',
          }),
        },
      }),
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});