import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import type { ResponsibilityDto } from '../../../lib/api/responsibilities';
import { ActiveWorkSurface } from './ActiveWorkSurface';
import { buildCarryState } from './responsibility-carry-state';

function makePersonalResponsibility(
  overrides: Partial<ResponsibilityDto> = {},
): ResponsibilityDto {
  return {
    id: 'responsibility-personal-1',
    kind: 'PERSONAL_NEED_RESOLUTION',
    objective: 'Keep my housing stable while I wait for the landlord response',
    status: 'WAITING_ON_THIRD_PARTY',
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

function renderResponsibility(responsibility: ResponsibilityDto) {
  const carryState = buildCarryState(responsibility);
  if (!carryState) throw new Error('expected carry state');
  return render(<ActiveWorkSurface {...carryState} />);
}

describe('UI-004 Waiting', () => {
  it('shows canonical holder, last/next follow-up, due provenance, and no-action truth from Step-5', () => {
    renderResponsibility(
      makePersonalResponsibility({
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: {
            version: 'people-step5-obligation-v1',
            owner: 'THIRD_PARTY',
            requiredAction: 'The property manager must confirm whether the unit is available.',
            dueAt: '2026-09-24T17:00:00.000Z',
            dueProvenance: 'VERIFIED',
            state: 'WAITING',
            lastAttemptAt: '2026-09-21T14:00:00.000Z',
            nextAttemptAt: '2026-09-22T14:00:00.000Z',
            reviewRequired: false,
          },
        },
      }),
    );

    const waiting = screen.getByRole('region', { name: 'Waiting' });
    expect(within(waiting).getByText('Held by An outside party')).toBeInTheDocument();
    expect(
      within(waiting).getByText('The property manager must confirm whether the unit is available.'),
    ).toBeInTheDocument();
    expect(within(waiting).getByText('Last follow-up')).toBeInTheDocument();
    expect(within(waiting).getByText('Next follow-up')).toBeInTheDocument();
    expect(within(waiting).getByText(/verified/i)).toBeInTheDocument();
    expect(within(waiting).getByText('Nothing you need to do.')).toBeInTheDocument();
  });

  it('never says nothing is needed when the member owns the wait', () => {
    renderResponsibility(
      makePersonalResponsibility({
        status: 'WAITING_ON_USER',
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
            reviewRequired: false,
          },
        },
      }),
    );

    const waiting = screen.getByRole('region', { name: 'Waiting' });
    expect(within(waiting).getByText('Held by You')).toBeInTheDocument();
    expect(within(waiting).queryByText('Nothing you need to do.')).not.toBeInTheDocument();
    expect(screen.getByText('Needs you')).toBeInTheDocument();
  });

  it('does not relabel generic Responsibility activity as a last chase when no follow-through attempt exists', () => {
    renderResponsibility(
      makePersonalResponsibility({
        status: 'WAITING_ON_THIRD_PARTY',
        updatedAt: '2026-09-21T16:00:00.000Z',
        successCriteria: { type: 'PERSONAL_NEED_RESOLUTION' },
      }),
    );

    const waiting = screen.getByRole('region', { name: 'Waiting' });
    expect(within(waiting).getByText('Held by An outside party')).toBeInTheDocument();
    expect(within(waiting).queryByText('Last follow-up')).not.toBeInTheDocument();
    expect(within(waiting).queryByText('Next follow-up')).not.toBeInTheDocument();
    expect(within(waiting).getByText('Nothing you need to do.')).toBeInTheDocument();
  });

  it('keeps review-required/disputed follow-through from claiming the member has nothing to do', () => {
    renderResponsibility(
      makePersonalResponsibility({
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: {
            version: 'people-step5-obligation-v1',
            owner: 'THIRD_PARTY',
            requiredAction: 'Resolve the disputed move-in date.',
            dueAt: '2026-09-24T17:00:00.000Z',
            dueProvenance: 'VERIFIED',
            state: 'DISPUTED',
            lastAttemptAt: '2026-09-21T14:00:00.000Z',
            nextAttemptAt: null,
            reviewRequired: true,
          },
        },
      }),
    );

    const waiting = screen.getByRole('region', { name: 'Waiting' });
    expect(within(waiting).queryByText('Nothing you need to do.')).not.toBeInTheDocument();
  });

  it('does not resurrect a satisfied member-owned obligation from stale WAITING_ON_USER status', () => {
    renderResponsibility(
      makePersonalResponsibility({
        status: 'WAITING_ON_USER',
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: {
            version: 'people-step5-obligation-v1',
            owner: 'MEMBER',
            requiredAction: 'Upload the requested proof of income.',
            dueAt: '2026-09-24T17:00:00.000Z',
            dueProvenance: 'REPORTED',
            state: 'SATISFIED_REPORTED',
            lastAttemptAt: '2026-09-21T14:00:00.000Z',
            nextAttemptAt: null,
            reviewRequired: false,
          },
        },
      }),
    );

    expect(screen.queryByRole('region', { name: 'Waiting' })).not.toBeInTheDocument();
    expect(screen.queryByText('Needs you')).not.toBeInTheDocument();
    expect(screen.queryByText(/^You: /)).not.toBeInTheDocument();
    expect(screen.getByText('That follow-up is no longer waiting. The underlying need remains open.')).toBeInTheDocument();
    expect(screen.getByText(/^Aureus: Aureus continues carrying the underlying need\.$/)).toBeInTheDocument();
  });

  it('does not resurrect a satisfied third-party obligation from stale WAITING_ON_THIRD_PARTY status', () => {
    renderResponsibility(
      makePersonalResponsibility({
        status: 'WAITING_ON_THIRD_PARTY',
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: {
            version: 'people-step5-obligation-v1',
            owner: 'THIRD_PARTY',
            requiredAction: 'The property manager must confirm the move-in date.',
            dueAt: '2026-09-24T17:00:00.000Z',
            dueProvenance: 'VERIFIED',
            state: 'SATISFIED_VERIFIED',
            lastAttemptAt: '2026-09-21T14:00:00.000Z',
            nextAttemptAt: null,
            reviewRequired: false,
          },
        },
      }),
    );

    expect(screen.queryByRole('region', { name: 'Waiting' })).not.toBeInTheDocument();
    expect(screen.queryByText('Held by An outside party')).not.toBeInTheDocument();
    expect(screen.queryByText(/^An outside party: /)).not.toBeInTheDocument();
    expect(screen.getByText('Aureus is still carrying the underlying need.')).toBeInTheDocument();
  });

  it('does not create Waiting from HUMAN_STEWARD ownership after verified satisfaction', () => {
    renderResponsibility(
      makePersonalResponsibility({
        status: 'ACTIVE',
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: {
            version: 'people-step5-obligation-v1',
            owner: 'HUMAN_STEWARD',
            requiredAction: 'The assigned Human Steward must verify the housing callback.',
            dueAt: '2026-09-24T17:00:00.000Z',
            dueProvenance: 'VERIFIED',
            state: 'SATISFIED_VERIFIED',
            lastAttemptAt: '2026-09-21T14:00:00.000Z',
            nextAttemptAt: null,
            reviewRequired: false,
          },
        },
      }),
    );

    expect(screen.queryByRole('region', { name: 'Waiting' })).not.toBeInTheDocument();
    expect(screen.queryByText('Held by A Human Steward')).not.toBeInTheDocument();
    expect(screen.queryByText('Needs you')).not.toBeInTheDocument();
  });

  it('has no accessibility violations for a fully populated wait', async () => {
    const { container } = renderResponsibility(
      makePersonalResponsibility({
        successCriteria: {
          type: 'PERSONAL_NEED_RESOLUTION',
          step5FollowThrough: {
            version: 'people-step5-obligation-v1',
            owner: 'HUMAN_STEWARD',
            requiredAction: 'The assigned Human Steward must review the source-backed due date.',
            dueAt: '2026-09-24T17:00:00.000Z',
            dueProvenance: 'VERIFIED',
            state: 'WAITING',
            lastAttemptAt: '2026-09-21T14:00:00.000Z',
            nextAttemptAt: '2026-09-22T14:00:00.000Z',
            reviewRequired: false,
          },
        },
      }),
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
