import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  getActiveLegalMatter,
  type LegalMatterDto,
} from '../../../lib/api/legal-matters';
import { LegalMatterPanel, LEGAL_ROLE_DISCLOSURE } from './LegalMatterPanel';

jest.mock('../../../lib/api/legal-matters');

const mockedApi = {
  getActiveLegalMatter: getActiveLegalMatter as jest.MockedFunction<typeof getActiveLegalMatter>,
};

const baseMatter: LegalMatterDto = {
  id: 'matter-1',
  userId: 'user-1',
  responsibilityId: 'responsibility-1',
  statedNeedId: 'need-1',
  matterType: 'housing / eviction',
  jurisdiction: 'Pennsylvania',
  forum: 'Philadelphia Municipal Court',
  proceduralPosture: 'complaint received',
  urgency: 'TIME_SENSITIVE',
  disclosureAcknowledgedAt: '2026-09-17T22:00:00.000Z',
  assistanceMode: 'SAFE_MODE',
  legalReviewRequired: true,
  outcomeSummary: null,
  closedAt: null,
  createdAt: '2026-09-17T22:00:00.000Z',
  updatedAt: '2026-09-17T22:00:00.000Z',
  responsibility: {
    id: 'responsibility-1',
    objective: 'Carry this housing matter to a truthful outcome',
    status: 'ACTIVE',
    kind: 'PERSONAL_NEED_RESOLUTION',
    events: [],
  },
  sources: [],
  facts: [],
  deadlines: [],
  reviewRequests: [],
  documentLinks: [],
  legalAidResources: [],
  representationRouting: {
    publicDefenderAutomaticallyAssumed: false,
    route: 'VERIFY_COUNSEL_ELIGIBILITY_AND_USE_VERIFIED_LEGAL_AID_OR_OFFICIAL_SELF_HELP',
    note: 'Aureus never assumes a public defender is available.',
  },
  jurisdictionGate: {
    status: 'SAFE_MODE_ONLY',
    sourceUrl: null,
    checkedAt: null,
    effectiveAt: null,
    notes: 'No governed expanded-assistance policy is active.',
  },
  retention: {
    basis: 'LEGAL_MATTER_POLICY_PENDING',
    state: 'ACTIVE',
    reviewAt: null,
    legalHoldBasis: null,
  },
};

describe('LegalMatterPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the member-facing role disclosure and blocks Matter creation until it is acknowledged', async () => {
    mockedApi.getActiveLegalMatter.mockResolvedValue(null);
    const user = userEvent.setup();

    render(
      <LegalMatterPanel
        accessToken="token"
        conversationId="conversation-1"
        statedNeedId="need-1"
        statedNeedContent="I received an eviction complaint."
      />,
    );

    await screen.findByRole('button', { name: 'Open a legal Matter' });
    await user.click(screen.getByRole('button', { name: 'Open a legal Matter' }));

    expect(screen.getByText(LEGAL_ROLE_DISCLOSURE)).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Open Matter' });
    expect(submit).toBeDisabled();

    await user.click(
      screen.getByRole('checkbox', {
        name: /I understand Aureus is acting as a steward, not my lawyer or law firm/i,
      }),
    );
    expect(submit).toBeEnabled();
  });

  it('makes safe mode and reported-vs-verified truth visible on an active Matter', async () => {
    mockedApi.getActiveLegalMatter.mockResolvedValue({
      ...baseMatter,
      deadlines: [
        {
          id: 'deadline-1',
          label: 'Hearing',
          dueAt: '2026-09-25T13:00:00.000Z',
          timeZone: 'America/New_York',
          trigger: 'Date printed on the complaint',
          calculationBasis: null,
          sourceId: null,
          status: 'REPORTED',
          completedAt: null,
        },
      ],
      sources: [
        {
          id: 'source-1',
          title: 'Court page',
          url: 'https://www.courts.phila.gov/',
          kind: 'OFFICIAL_PROCEDURE',
          jurisdiction: 'Pennsylvania',
          proposition: 'Member believes this is the official court procedure page.',
          provenance: 'REPORTED',
          verification: 'MEMBER_REPORTED',
          checkedAt: '2026-09-17T22:00:00.000Z',
          verifiedAt: null,
          verificationNote: null,
          createdAt: '2026-09-17T22:00:00.000Z',
        },
      ],
    });

    render(
      <LegalMatterPanel
        accessToken="token"
        conversationId="conversation-1"
        statedNeedId="need-1"
        statedNeedContent="I received an eviction complaint."
      />,
    );

    await waitFor(() => expect(screen.getByText('Safe mode')).toBeInTheDocument());
    expect(
      screen.getByText(/No governed expanded-assistance policy is active/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Reported — not yet legally verified')).toBeInTheDocument();
    expect(
      screen.getByText('Member-reported source — identity not yet verified'),
    ).toBeInTheDocument();
    expect(screen.getByText(LEGAL_ROLE_DISCLOSURE)).toBeInTheDocument();
  });
});
