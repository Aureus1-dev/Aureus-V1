import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import * as api from '../../../lib/api/application-guide';
import * as peopleHelp from '../../../lib/api/people-help';
import { ApplicationGuidePanel } from './ApplicationGuidePanel';

jest.mock('../../../lib/api/application-guide');
jest.mock('../../../lib/api/people-help');

const mockedApi = api as jest.Mocked<typeof api>;
const mockedPeopleHelp = peopleHelp as jest.Mocked<typeof peopleHelp>;

const session: api.GuidedApplicationSessionDto = {
  id: 'session-1',
  conversationId: 'conversation-1',
  opportunityId: 'opportunity-1',
  opportunityTitle: 'Water assistance application',
  provider: 'Official Agency',
  applicationUrl: 'https://example.gov/apply',
  status: 'ACTIVE',
  screenCaptureConsentGrantedAt: null,
  screenCaptureConsentRevokedAt: null,
  lastFrameAnalyzedAt: null,
};

describe('ApplicationGuidePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not expose capture controls before explicit consent', () => {
    render(
      <ApplicationGuidePanel
        accessToken="token"
        session={session}
        responsibility={null}
        onSessionChange={jest.fn()}
        onResponsibilityChange={jest.fn()}
        onEnded={jest.fn()}
      />,
    );

    expect(screen.getByText(/cannot click, type, autofill/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /choose a screen/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Share a screenshot instead')).not.toBeInTheDocument();
  });

  it('records consent before exposing user-controlled capture choices', async () => {
    mockedApi.setGuidedApplicationConsent.mockResolvedValue({
      ...session,
      screenCaptureConsentGrantedAt: '2026-08-29T20:00:00.000Z',
    });
    const onSessionChange = jest.fn();

    render(
      <ApplicationGuidePanel
        accessToken="token"
        session={session}
        responsibility={null}
        onSessionChange={onSessionChange}
        onResponsibilityChange={jest.fn()}
        onEnded={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('checkbox'));

    expect(mockedApi.setGuidedApplicationConsent).toHaveBeenCalledWith(
      'token',
      'session-1',
      true,
    );
    expect(onSessionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        screenCaptureConsentGrantedAt: '2026-08-29T20:00:00.000Z',
      }),
    );
  });

  it('treats consent older than 30 minutes as expired in the UI', () => {
    render(
      <ApplicationGuidePanel
        accessToken="token"
        session={{
          ...session,
          screenCaptureConsentGrantedAt: new Date(
            Date.now() - 31 * 60 * 1000,
          ).toISOString(),
        }}
        responsibility={null}
        onSessionChange={jest.fn()}
        onResponsibilityChange={jest.fn()}
        onEnded={jest.fn()}
      />,
    );

    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.queryByText('Share a screenshot instead')).not.toBeInTheDocument();
  });

  it('states the no-storage and sensitive-field boundary plainly', () => {
    render(
      <ApplicationGuidePanel
        accessToken="token"
        session={session}
        responsibility={null}
        onSessionChange={jest.fn()}
        onResponsibilityChange={jest.fn()}
        onEnded={jest.fn()}
      />,
    );

    expect(screen.getByText(/does not store the screenshot image/i)).toBeInTheDocument();
    expect(screen.getByText(/hide any filled password, SSN, bank\/card number/i)).toBeInTheDocument();
  });

  it('pauses a carried Responsibility instead of silently ending the work', async () => {
    const responsibility: peopleHelp.PeopleResponsibilityDto = {
      id: 'responsibility-1',
      kind: 'OPPORTUNITY_APPLICATION_GUIDANCE',
      objective: 'Help me work through the verified application',
      status: 'ACTIVE',
      contextType: 'PERSONAL',
      authorityClass: 'GUIDANCE_ONLY',
      authorityPolicyVersion: 'responsibility-guidance-v1',
      privacyScope: 'PERSONAL_PRIVATE',
      privacyPolicyVersion: 'personal-private-v1',
      originConversationId: session.conversationId,
      originOpportunityId: session.opportunityId,
      successCriteria: {},
      dueAt: null,
      retentionExpiresAt: null,
      completedAt: null,
      createdAt: '2026-09-01T20:00:00.000Z',
      updatedAt: '2026-09-01T20:00:00.000Z',
      events: [],
    };
    const waiting = { ...responsibility, status: 'WAITING_ON_USER' as const };
    mockedPeopleHelp.pausePeopleApplicationHelp.mockResolvedValue({
      paused: true,
      responsibility: waiting,
    });
    const onResponsibilityChange = jest.fn();
    const onEnded = jest.fn();

    render(
      <ApplicationGuidePanel
        accessToken="token"
        session={session}
        responsibility={responsibility}
        onSessionChange={jest.fn()}
        onResponsibilityChange={onResponsibilityChange}
        onEnded={onEnded}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /pause for now/i }));

    expect(mockedPeopleHelp.pausePeopleApplicationHelp).toHaveBeenCalledWith(
      'token',
      'session-1',
    );
    expect(onResponsibilityChange).toHaveBeenCalledWith(waiting);
    expect(onEnded).toHaveBeenCalled();
  });

  it('records application completion only through the explicit member outcome action', async () => {
    const responsibility: peopleHelp.PeopleResponsibilityDto = {
      id: 'responsibility-1',
      kind: 'OPPORTUNITY_APPLICATION_GUIDANCE',
      objective: 'Help me work through the verified application',
      status: 'ACTIVE',
      contextType: 'PERSONAL',
      authorityClass: 'GUIDANCE_ONLY',
      authorityPolicyVersion: 'responsibility-guidance-v1',
      privacyScope: 'PERSONAL_PRIVATE',
      privacyPolicyVersion: 'personal-private-v1',
      originConversationId: session.conversationId,
      originOpportunityId: session.opportunityId,
      successCriteria: {},
      dueAt: null,
      retentionExpiresAt: null,
      completedAt: null,
      createdAt: '2026-09-01T20:00:00.000Z',
      updatedAt: '2026-09-01T20:00:00.000Z',
      events: [],
    };
    const completed = { ...responsibility, status: 'COMPLETED' as const };
    mockedPeopleHelp.completePeopleApplicationHelp.mockResolvedValue({
      responsibility: completed,
      ended: true,
      outcome: 'APPLIED',
    });
    const onResponsibilityChange = jest.fn();

    render(
      <ApplicationGuidePanel
        accessToken="token"
        session={session}
        responsibility={responsibility}
        onSessionChange={jest.fn()}
        onResponsibilityChange={onResponsibilityChange}
        onEnded={jest.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /i submitted/i }));

    expect(mockedPeopleHelp.completePeopleApplicationHelp).toHaveBeenCalledWith(
      'token',
      'session-1',
      'APPLIED',
    );
    expect(onResponsibilityChange).toHaveBeenCalledWith(completed);
  });

  it('has no accessibility violations before consent', async () => {
    const { container } = render(
      <ApplicationGuidePanel
        accessToken="token"
        session={session}
        responsibility={null}
        onSessionChange={jest.fn()}
        onResponsibilityChange={jest.fn()}
        onEnded={jest.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
