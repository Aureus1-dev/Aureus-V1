import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import {
  createKitchenBathHandoff,
  getKitchenBathPack,
} from '../../../lib/api/kitchen-bath';
import { getPublicWard } from '../../../lib/api/public-ward';
import { KitchenBathIntakePanel } from './KitchenBathIntakePanel';

jest.mock('../../../lib/api/kitchen-bath', () => ({
  createKitchenBathHandoff: jest.fn(),
  getKitchenBathPack: jest.fn(),
}));

jest.mock('../../../lib/api/public-ward', () => ({
  getPublicWard: jest.fn(),
}));

const mockCreate = createKitchenBathHandoff as jest.MockedFunction<
  typeof createKitchenBathHandoff
>;
const mockPack = getKitchenBathPack as jest.MockedFunction<
  typeof getKitchenBathPack
>;
const mockWard = getPublicWard as jest.MockedFunction<typeof getPublicWard>;

const readyProject = {
  contractVersion: 'or003-ready-project-v1' as const,
  vertical: 'KITCHEN_BATH' as const,
  readinessStatus: 'READY_FOR_EXPERT_REVIEW' as const,
  customerIntent: {
    projectType: 'KITCHEN',
    rooms: ['Kitchen'],
    scope: 'Open the layout and replace worn cabinetry.',
    priorities: ['FUNCTION_AND_LAYOUT'],
    mustHaves: 'Keep pantry storage.',
    concerns: 'Avoid blocking the back door.',
  },
  constraints: {
    projectLocation: 'Philadelphia',
    desiredTiming: 'ONE_TO_THREE_MONTHS',
    decisionStatus: 'OWNER_DECISION_MAKER',
    budgetRange: 'UNSURE',
    designNeeds: null,
    attachments: [],
  },
  source: {
    basis: 'CONSENTED_WARD_HANDOFF' as const,
    modelInferencesIncluded: false as const,
  },
  expertValidationRequired: ['Confirm physical measurements and site conditions.'],
  boundaries: ['This is not a quote or appointment.'],
  missingRequiredSource: [],
};

const ward = {
  slug: 'example-kitchens',
  name: 'Example Kitchens',
  description: 'Kitchen remodeling.',
  websiteUrl: 'https://example.com',
  serviceArea: {},
  businessHours: {},
  contactRoutes: [],
  handoff: {
    consentVersion: 'lead-handoff-v1' as const,
    consentText:
      'I agree to share my project information with Example Kitchens so its team can contact me.',
    consentTextSha256: 'a'.repeat(64),
    dataClasses: ['identity', 'contact', 'project', 'conversation'] as [
      'identity',
      'contact',
      'project',
      'conversation',
    ],
    retentionDays: 90,
    minimumFields: ['name', 'preferred contact', 'project summary'],
  },
  notice: 'Approved information only.',
};

describe('KitchenBathIntakePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    window.sessionStorage.setItem(
      'aureus:ward:example-kitchens',
      JSON.stringify({
        conversationId: 'conversation-1',
        accessToken: 'opaque-token',
      }),
    );
    mockPack.mockResolvedValue({
      active: true,
      vertical: 'KITCHEN_BATH',
      intakeAvailable: true,
      estimationBoundary:
        'The Ward cannot fabricate a quote or appointment.',
      attachments: null,
    });
    mockWard.mockResolvedValue(ward);
    mockCreate.mockResolvedValue({
      handoffId: 'lead-1',
      status: 'SUBMITTED',
      preferredContactMethod: 'EMAIL',
      submittedAt: '2026-09-02T00:00:00.000Z',
      retentionExpiresAt: '2026-12-01T00:00:00.000Z',
      confirmation: 'Shared with Example Kitchens.',
      readyProject,
    });
  });

  it('collects transparent project values and returns the Ready Project outcome surface', async () => {
    const { container } = render(
      <KitchenBathIntakePanel slug="example-kitchens" />,
    );
    const user = userEvent.setup();

    await screen.findByRole('heading', {
      name: /Give the team useful project context/i,
    });

    await user.type(screen.getByLabelText('Your name'), 'Jordan');
    await user.type(screen.getByLabelText('Email address'), 'jordan@example.com');
    await user.type(screen.getByLabelText(/Rooms/i), 'Kitchen');
    await user.type(
      screen.getByLabelText(/What are you hoping to change/i),
      'Open the layout and replace worn cabinetry.',
    );
    await user.click(screen.getByLabelText('Function & layout'));
    await user.type(screen.getByLabelText(/Must-haves/i), 'Keep pantry storage.');
    await user.type(
      screen.getByLabelText(/Concerns or things to avoid/i),
      'Avoid blocking the back door.',
    );

    const submit = screen.getByRole('button', {
      name: /Share project with the business/i,
    });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: /I agree to share/i }));
    await user.click(submit);

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(
      'example-kitchens',
      'conversation-1',
      'opaque-token',
      expect.objectContaining({
        displayName: 'Jordan',
        contactValue: 'jordan@example.com',
        kitchenBath: expect.objectContaining({
          projectType: 'KITCHEN',
          rooms: ['Kitchen'],
          priorities: ['FUNCTION_AND_LAYOUT'],
          mustHaves: 'Keep pantry storage.',
          concerns: 'Avoid blocking the back door.',
        }),
        consentGranted: true,
      }),
    );

    expect(
      await screen.findByText(/Aureus organized your project for expert review/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/This is not a quote or appointment/i)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('does not claim nothing was shared when Ready Project confirmation fails after submission began', async () => {
    mockCreate.mockRejectedValue(new Error('enrichment confirmation failed'));

    render(<KitchenBathIntakePanel slug="example-kitchens" />);
    const user = userEvent.setup();

    await screen.findByRole('heading', {
      name: /Give the team useful project context/i,
    });
    await user.type(screen.getByLabelText('Your name'), 'Jordan');
    await user.type(screen.getByLabelText('Email address'), 'jordan@example.com');
    await user.type(screen.getByLabelText(/Rooms/i), 'Kitchen');
    await user.type(
      screen.getByLabelText(/What are you hoping to change/i),
      'Open the layout and replace worn cabinetry.',
    );
    await user.click(screen.getByRole('checkbox', { name: /I agree to share/i }));
    await user.click(
      screen.getByRole('button', { name: /Share project with the business/i }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/handoff may already be queued/i);
    expect(alert).not.toHaveTextContent(/nothing new was shared/i);
  });
});
