import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import * as api from '../../../lib/api/application-guide';
import { ApplicationGuidePanel } from './ApplicationGuidePanel';

jest.mock('../../../lib/api/application-guide');

const mockedApi = api as jest.Mocked<typeof api>;

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
        onSessionChange={jest.fn()}
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
        onSessionChange={onSessionChange}
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

  it('states the no-storage and sensitive-field boundary plainly', () => {
    render(
      <ApplicationGuidePanel
        accessToken="token"
        session={session}
        onSessionChange={jest.fn()}
        onEnded={jest.fn()}
      />,
    );

    expect(screen.getByText(/does not store the screenshot image/i)).toBeInTheDocument();
    expect(screen.getByText(/hide any filled password, SSN, bank\/card number/i)).toBeInTheDocument();
  });

  it('has no accessibility violations before consent', async () => {
    const { container } = render(
      <ApplicationGuidePanel
        accessToken="token"
        session={session}
        onSessionChange={jest.fn()}
        onEnded={jest.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
