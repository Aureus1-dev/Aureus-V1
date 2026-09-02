import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PeopleResponsibilityDto } from '../../../lib/api/people-help';
import { ResponsibilityProgressCard } from './ResponsibilityProgressCard';

function makeResponsibility(
  overrides: Partial<PeopleResponsibilityDto> = {},
): PeopleResponsibilityDto {
  return {
    id: 'responsibility-1',
    kind: 'OPPORTUNITY_APPLICATION_GUIDANCE',
    objective: 'Help me work through the verified application',
    status: 'ACTIVE',
    contextType: 'PERSONAL',
    authorityClass: 'GUIDANCE_ONLY',
    authorityPolicyVersion: 'responsibility-guidance-v1',
    privacyScope: 'PERSONAL_PRIVATE',
    privacyPolicyVersion: 'personal-private-v1',
    originConversationId: 'conversation-1',
    originOpportunityId: 'opportunity-1',
    successCriteria: {},
    dueAt: null,
    retentionExpiresAt: null,
    completedAt: null,
    createdAt: '2026-09-01T20:00:00.000Z',
    updatedAt: '2026-09-01T20:00:00.000Z',
    events: [],
    ...overrides,
  };
}

describe('ResponsibilityProgressCard', () => {
  it('makes private stewardship and the guidance boundary explicit', () => {
    render(
      <ResponsibilityProgressCard
        responsibility={makeResponsibility()}
      />,
    );

    expect(
      screen.getByText(/Aureus is carrying this with you/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Private to your Aureus account/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/you remain in control of what you enter, attest to, and submit/i),
    ).toBeInTheDocument();
  });

  it('offers resume when waiting on the member', async () => {
    const onResume = jest.fn();
    render(
      <ResponsibilityProgressCard
        responsibility={makeResponsibility({
          status: 'WAITING_ON_USER',
        })}
        onResume={onResume}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /continue with Aureus/i }),
    );
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('labels completed application status as member-reported rather than verified', () => {
    render(
      <ResponsibilityProgressCard
        responsibility={makeResponsibility({
          status: 'COMPLETED',
          completedAt: '2026-09-01T21:00:00.000Z',
          events: [
            {
              id: 'event-1',
              type: 'COMPLETED',
              actorClass: 'SYSTEM',
              actorUserId: null,
              fromStatus: 'ACTIVE',
              toStatus: 'COMPLETED',
              sourceSystem: 'OPPORTUNITY_ENGINE',
              sourceRecordType: 'SavedOpportunity',
              sourceRecordId: 'saved-1',
              sourceState: 'APPLIED',
              evidenceLevel: 'REPORTED',
              occurredAt: '2026-09-01T21:00:00.000Z',
            },
          ],
        })}
      />,
    );

    expect(
      screen.getByText(/Application status: submitted/applied — reported by you/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/approved by/i)).not.toBeInTheDocument();
  });
});
