import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import type { PeopleResponsibilityDto, PeopleResponsibilityEventDto } from '../../../lib/api/people-help';
import { buildCarryState } from './responsibility-carry-state';
import { ActiveWorkSurface } from './ActiveWorkSurface';

function makeEvent(overrides: Partial<PeopleResponsibilityEventDto> = {}): PeopleResponsibilityEventDto {
  return {
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
    ...overrides,
  };
}

function makeResponsibility(overrides: Partial<PeopleResponsibilityDto> = {}): PeopleResponsibilityDto {
  return {
    id: 'responsibility-1',
    kind: 'OPPORTUNITY_APPLICATION_GUIDANCE',
    objective: 'Complete the Career Training Grant application',
    status: 'ACTIVE',
    contextType: 'PERSONAL',
    authorityClass: 'GUIDANCE_ONLY',
    authorityPolicyVersion: 'responsibility-guidance-v1',
    privacyScope: 'PERSONAL_PRIVATE',
    privacyPolicyVersion: 'personal-private-v1',
    originConversationId: 'conversation-1',
    originOpportunityId: 'opportunity-1',
    successCriteria: { type: 'APPLICATION_GUIDANCE_MEMBER_OUTCOME_RECORDED' },
    dueAt: null,
    retentionExpiresAt: null,
    completedAt: null,
    createdAt: '2026-09-01T20:00:00.000Z',
    updatedAt: '2026-09-01T20:00:00.000Z',
    events: [],
    ...overrides,
  };
}

/** Renders exactly what ConversationSurface renders once buildCarryState resolves, so these tests prove the real projection reaches the real DOM, not a hand-authored prop shape. */
function renderFromResponsibility(
  responsibility: PeopleResponsibilityDto,
  hasActiveGuideSession = false,
  extra: Partial<Parameters<typeof ActiveWorkSurface>[0]> = {},
) {
  const carryState = buildCarryState(responsibility, hasActiveGuideSession);
  if (!carryState) throw new Error('expected a Carry State for this test');
  return render(<ActiveWorkSurface {...carryState} {...extra} />);
}

describe('ActiveWorkSurface', () => {
  it('state 1 — ACTIVE with a live guide session: describes Aureus as genuinely guiding, no Needs you', () => {
    renderFromResponsibility(makeResponsibility({ status: 'ACTIVE' }), true);

    const surface = screen.getByRole('region', { name: 'Active work' });
    expect(
      within(surface).getByRole('heading', { name: 'Complete the Career Training Grant application' }),
    ).toBeInTheDocument();
    expect(within(surface).getByText(/guiding you through the verified application/i)).toBeInTheDocument();
    expect(within(surface).queryByText('Needs you')).not.toBeInTheDocument();
    expect(within(surface).getByText(/^Aureus: Continue the guided application\.$/)).toBeInTheDocument();
  });

  it('state 2 — ACTIVE with no live guide session: renders the sourced structured resume ask and no duplicate Next action', () => {
    const onResume = jest.fn();
    renderFromResponsibility(makeResponsibility({ status: 'ACTIVE' }), false, { onResume });

    const surface = screen.getByRole('region', { name: 'Active work' });
    // The live-guiding phrase (state 1's "Guiding you through the verified
    // application.") must not appear here — no session is active. The
    // structured ask's own "Then I'll" continuation legitimately promises
    // future guidance ("I will continue guiding you…"), so this checks the
    // specific live-carrying phrase rather than the whole word "guiding".
    expect(
      within(surface).queryByText(/guiding you through the verified application/i),
    ).not.toBeInTheDocument();
    expect(within(surface).getByText('I need one thing from you')).toBeInTheDocument();
    expect(within(surface).getByText('Resume the application when you are ready.')).toBeInTheDocument();
    expect(
      within(surface).getByText(
        'Only you can enter private information, attest to it, and submit this application. I cannot do those steps for you.',
      ),
    ).toBeInTheDocument();
    expect(
      within(surface).getByText('Once you reopen it, I will continue guiding you from the current application.'),
    ).toBeInTheDocument();
    expect(within(surface).getByText('If you can’t')).toBeInTheDocument();
    expect(within(surface).queryByText('Needs you')).not.toBeInTheDocument();
    expect(within(surface).queryByText('Next action')).not.toBeInTheDocument();

    const resumeButton = within(surface).getByRole('button', { name: 'Continue with Aureus' });
    expect(resumeButton).toBeInTheDocument();
  });

  it('the Resume action, when present, actually calls the handler supplied by the caller', async () => {
    const onResume = jest.fn();
    renderFromResponsibility(makeResponsibility({ status: 'ACTIVE' }), false, { onResume });
    await userEvent.click(screen.getByRole('button', { name: 'Continue with Aureus' }));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('state 3 — WAITING_ON_USER application guidance: paused and represented by the same structured resume ask', () => {
    renderFromResponsibility(makeResponsibility({ status: 'WAITING_ON_USER' }));

    const surface = screen.getByRole('region', { name: 'Active work' });
    expect(within(surface).getByText(/^Status/)).toBeInTheDocument();
    expect(
      within(surface).getByText('Paused for you. Come back when you are ready and Aureus will pick it up here.'),
    ).toBeInTheDocument();
    expect(within(surface).getByText('I need one thing from you')).toBeInTheDocument();
    expect(within(surface).getByText('Resume the application when you are ready.')).toBeInTheDocument();
    expect(within(surface).queryByText('Needs you')).not.toBeInTheDocument();
    expect(within(surface).queryByText('Next action')).not.toBeInTheDocument();
  });

  it('state 4 — WAITING_ON_THIRD_PARTY: no Needs you, next action clearly owned by an outside party', () => {
    renderFromResponsibility(makeResponsibility({ status: 'WAITING_ON_THIRD_PARTY' }));

    const surface = screen.getByRole('region', { name: 'Active work' });
    expect(within(surface).getByText('Waiting on an outside party.')).toBeInTheDocument();
    expect(within(surface).queryByText('Needs you')).not.toBeInTheDocument();
    expect(within(surface).getByText(/^An outside party: /)).toBeInTheDocument();
  });

  it('state 5 — BLOCKED: visibly distinct from active work, next action stays with Aureus', () => {
    renderFromResponsibility(makeResponsibility({ status: 'BLOCKED' }));

    const surface = screen.getByRole('region', { name: 'Active work' });
    expect(within(surface).getByText(/blocker/i)).toBeInTheDocument();
    expect(within(surface).queryByText('Needs you')).not.toBeInTheDocument();
    expect(within(surface).getByText(/^Aureus: /)).toBeInTheDocument();
  });

  it('state 6 — COMPLETED with evidence: never described as in progress, evidence reflects real reported outcome, no Next action', () => {
    renderFromResponsibility(
      makeResponsibility({
        status: 'COMPLETED',
        completedAt: '2026-09-01T21:00:00.000Z',
        events: [makeEvent()],
      }),
    );

    const surface = screen.getByRole('region', { name: 'Active work' });
    expect(within(surface).getByText(/completed/i)).toBeInTheDocument();
    expect(within(surface).queryByText(/in progress|guiding you/i)).not.toBeInTheDocument();
    expect(within(surface).queryByText('Needs you')).not.toBeInTheDocument();
    expect(within(surface).queryByText('Next action')).not.toBeInTheDocument();
    expect(within(surface).getByText('Evidence')).toBeInTheDocument();
    expect(within(surface).getByText(/submitted\/applied/i)).toBeInTheDocument();
  });

  it('does not invent an Evidence section when there is no real evidence, even for completed work', () => {
    renderFromResponsibility(makeResponsibility({ status: 'COMPLETED', completedAt: '2026-09-01T21:00:00.000Z' }));
    const surface = screen.getByRole('region', { name: 'Active work' });
    expect(within(surface).queryByText('Evidence')).not.toBeInTheDocument();
  });

  it('state 7 — RESPONSIBLY_EXHAUSTED: no responsible path remains, no Next action invented', () => {
    renderFromResponsibility(makeResponsibility({ status: 'RESPONSIBLY_EXHAUSTED' }));

    const surface = screen.getByRole('region', { name: 'Active work' });
    expect(within(surface).getByText('No responsible path remains right now.')).toBeInTheDocument();
    expect(within(surface).queryByText('Needs you')).not.toBeInTheDocument();
    expect(within(surface).queryByText('Next action')).not.toBeInTheDocument();
  });

  it('state 8 — no durable Responsibility: renders the honest pre-acceptance shape with no Status/Next action/Evidence/Last activity invented', () => {
    render(
      <ActiveWorkSurface
        workingOn="Help me avoid a utility shutoff"
        carrying="Nothing further in progress right now — ask for more anytime."
        doneMeans="You'll know this is done when Aureus gives you a clear result or next step."
      />,
    );

    const surface = screen.getByRole('region', { name: 'Active work' });
    expect(
      within(surface).getByRole('heading', { name: 'Help me avoid a utility shutoff' }),
    ).toBeInTheDocument();
    expect(within(surface).queryByText(/^Status/)).not.toBeInTheDocument();
    expect(within(surface).queryByText('Needs you')).not.toBeInTheDocument();
    expect(within(surface).queryByText('Next action')).not.toBeInTheDocument();
    expect(within(surface).queryByText('Evidence')).not.toBeInTheDocument();
    expect(within(surface).queryByText(/^Last activity/)).not.toBeInTheDocument();
  });

  it('composes the real ApplicationGuidePanel (or any real guide UI) beneath the primary block rather than a competing card', () => {
    renderFromResponsibility(makeResponsibility({ status: 'ACTIVE' }), true, {
      guidePanel: <div data-testid="real-guide-panel">real guide panel content</div>,
    });
    expect(screen.getByTestId('real-guide-panel')).toBeInTheDocument();
  });

  it('never renders a Resume button when the caller supplies no onResume handler, even when the structured ask is shown', () => {
    renderFromResponsibility(makeResponsibility({ status: 'WAITING_ON_USER' }));
    expect(screen.queryByRole('button', { name: 'Continue with Aureus' })).not.toBeInTheDocument();
  });

  it('carries the real authority/privacy boundary disclosure when one applies to this kind', () => {
    renderFromResponsibility(makeResponsibility({ status: 'ACTIVE' }), true);
    expect(screen.getByText(/private to your aureus account/i)).toBeInTheDocument();
  });

  it('has no accessibility violations for ACTIVE + live session', async () => {
    const { container } = renderFromResponsibility(makeResponsibility({ status: 'ACTIVE' }), true);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations for ACTIVE + Resume required, with a real Resume button', async () => {
    const { container } = renderFromResponsibility(makeResponsibility({ status: 'ACTIVE' }), false, {
      onResume: jest.fn(),
    });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations for COMPLETED with evidence', async () => {
    const { container } = renderFromResponsibility(
      makeResponsibility({ status: 'COMPLETED', completedAt: '2026-09-01T21:00:00.000Z', events: [makeEvent()] }),
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations for the no-durable-Responsibility fallback shape', async () => {
    const { container } = render(
      <ActiveWorkSurface
        workingOn="Help me avoid a utility shutoff"
        carrying="Nothing further in progress right now — ask for more anytime."
        doneMeans="You'll know this is done when Aureus gives you a clear result or next step."
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});