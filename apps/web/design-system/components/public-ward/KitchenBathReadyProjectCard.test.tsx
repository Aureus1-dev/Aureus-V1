import { render, screen } from '@testing-library/react';
import type { KitchenBathReadyProject } from '../../../lib/api/kitchen-bath';
import { KitchenBathReadyProjectCard } from './KitchenBathReadyProjectCard';

function makeProject(
  overrides: Partial<KitchenBathReadyProject> = {},
): KitchenBathReadyProject {
  return {
    contractVersion: 'or003-ready-project-v1',
    leadId: 'lead-1',
    vertical: 'KITCHEN_BATH',
    readinessStatus: 'READY_FOR_EXPERT_REVIEW',
    customerIntent: {
      projectType: 'KITCHEN',
      rooms: ['Kitchen'],
      scope: 'Open the layout and replace worn cabinetry.',
      priorities: ['FUNCTION_AND_LAYOUT', 'DURABILITY'],
      mustHaves: 'Keep pantry storage.',
      concerns: 'Do not block the back door.',
    },
    constraints: {
      projectLocation: 'Philadelphia',
      desiredTiming: 'ONE_TO_THREE_MONTHS',
      decisionStatus: 'OWNER_DECISION_MAKER',
      budgetRange: 'FROM_50000_TO_100000',
      designNeeds: 'Help compare layouts.',
      attachments: [],
    },
    source: {
      basis: 'CONSENTED_WARD_HANDOFF',
      consentVersion: 'lead-handoff-v1',
      intakeHash: 'a'.repeat(64),
      conversationTurns: 4,
      submittedAt: '2026-09-02T00:00:00.000Z',
      retentionExpiresAt: '2026-12-01T00:00:00.000Z',
      modelInferencesIncluded: false,
    },
    transactionBarriers: [
      {
        key: 'PRICE',
        status: 'BUSINESS_REQUIRED',
        basis: 'This intake does not establish final project price, allowances, or a quote.',
      },
      {
        key: 'FIT',
        status: 'EXPERT_REQUIRED',
        basis: 'Physical measurements and feasibility require qualified expert review.',
      },
      {
        key: 'TRUST',
        status: 'NOT_ASSESSED',
        basis: 'Aureus does not infer trust from conversation behavior.',
      },
    ],
    expertValidationRequired: [
      'Confirm physical measurements and site conditions.',
      'Establish final pricing and allowances from authorized business sources.',
    ],
    boundaries: [
      'Ready for expert review does not mean quote-ready.',
    ],
    missingRequiredSource: [],
    ...overrides,
  };
}

describe('KitchenBathReadyProjectCard', () => {
  it('shows customer priorities and expert-required uncertainty without pretending a quote exists', () => {
    render(<KitchenBathReadyProjectCard project={makeProject()} />);

    expect(
      screen.getByText(/Aureus organized your project for expert review/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Function & layout')).toBeInTheDocument();
    expect(screen.getByText('Durability')).toBeInTheDocument();
    expect(screen.getByText(/Business confirmation needed/i)).toBeInTheDocument();
    expect(screen.getByText(/Expert needed/i)).toBeInTheDocument();
    expect(screen.getByText(/Not assessed yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This is not a quote or appointment/i),
    ).toBeInTheDocument();
  });

  it('uses business-facing copy when shown to the contractor', () => {
    render(
      <KitchenBathReadyProjectCard
        project={makeProject()}
        audience="business"
      />,
    );

    expect(
      screen.getByText(/Aureus distilled the project for expert review/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Must-haves:/i)).toBeInTheDocument();
    expect(screen.getByText(/Concerns \/ avoid:/i)).toBeInTheDocument();
  });

  it('fails visibly closed when retained source is incomplete', () => {
    render(
      <KitchenBathReadyProjectCard
        project={makeProject({
          readinessStatus: 'INCOMPLETE_SOURCE',
          customerIntent: {
            projectType: 'KITCHEN',
            rooms: [],
            scope: null,
            priorities: [],
            mustHaves: null,
            concerns: null,
          },
          missingRequiredSource: ['rooms', 'scope'],
        })}
      />,
    );

    expect(
      screen.getByText(/Aureus found incomplete project source data/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Aureus did not guess the missing facts/i),
    ).toBeInTheDocument();
  });
});
