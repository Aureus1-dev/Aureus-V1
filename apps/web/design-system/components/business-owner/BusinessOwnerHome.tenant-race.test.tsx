import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getBusinessConsole } from '../../../lib/api/business-console';
import {
  getBusinessResponsibilityEvidence,
  listBusinessResponsibilities,
  type BusinessResponsibilityDto,
  type BusinessResponsibilityEvidenceReceipt,
} from '../../../lib/api/business-responsibilities';
import { useBusiness, useSession } from '../../../state';
import { BusinessOwnerHome } from './BusinessOwnerHome';

jest.mock('../../../state', () => ({ useSession: jest.fn(), useBusiness: jest.fn() }));
jest.mock('../../../lib/api/business-console', () => ({ getBusinessConsole: jest.fn() }));
jest.mock('../../../lib/api/business-responsibilities', () => ({
  listBusinessResponsibilities: jest.fn(),
  getBusinessResponsibilityEvidence: jest.fn(),
  markBusinessResponsibilityNeedsYou: jest.fn(),
  resumeBusinessResponsibility: jest.fn(),
  confirmBusinessResponsibilityCompletion: jest.fn(),
  cancelBusinessResponsibility: jest.fn(),
}));

const mockSession = useSession as jest.Mock;
const mockBusiness = useBusiness as jest.Mock;
const mockList = listBusinessResponsibilities as jest.MockedFunction<
  typeof listBusinessResponsibilities
>;
const mockConsole = getBusinessConsole as jest.MockedFunction<typeof getBusinessConsole>;
const mockEvidence = getBusinessResponsibilityEvidence as jest.MockedFunction<
  typeof getBusinessResponsibilityEvidence
>;

function responsibility(id: string, objective: string): BusinessResponsibilityDto {
  return {
    id,
    kind: 'BUSINESS_PROMISE',
    objective,
    status: 'ACTIVE',
    contextType: 'BUSINESS_TENANT',
    authorityClass: 'GUIDANCE_ONLY',
    authorityPolicyVersion: 'v1',
    privacyScope: 'BUSINESS_PRIVATE',
    privacyPolicyVersion: 'v1',
    originConversationId: null,
    originOpportunityId: null,
    successCriteria: { promise: 'Aureus will carry this work.' },
    dueAt: null,
    retentionExpiresAt: null,
    completedAt: null,
    createdAt: '2026-09-16T00:00:00.000Z',
    updatedAt: '2026-09-16T00:00:00.000Z',
    events: [],
  };
}

function receipt(id: string, objective: string): BusinessResponsibilityEvidenceReceipt {
  return {
    responsibilityId: id,
    organizationId: 'org-b',
    objective,
    promise: 'Aureus will carry this work.',
    criterion: 'The work reaches its stated outcome.',
    status: 'ACTIVE',
    dueAt: null,
    completedAt: null,
    evidenceSummary: 'No completion evidence has been recorded yet.',
    lifecycle: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function setTenant(id: string, name: string) {
  mockBusiness.mockReturnValue({
    activeTenant: { id, name },
    state: { isLoading: false, tenants: [{ id, name }], invitations: [] },
  });
}

describe('BusinessOwnerHome tenant-switch isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.mockReturnValue({ session: { accessToken: 'token' } });
  });

  it('hides previously loaded tenant data immediately while the next tenant is still loading', async () => {
    const orgBList = deferred<BusinessResponsibilityDto[]>();
    const orgBConsole = deferred<{ membershipRole: string }>();

    mockList.mockImplementation((_token, organizationId) => {
      if (organizationId === 'org-a') {
        return Promise.resolve([responsibility('a-private', 'Org A private work')]);
      }
      return orgBList.promise;
    });
    mockConsole.mockImplementation((_token, organizationId) => {
      if (organizationId === 'org-a') return Promise.resolve({ membershipRole: 'OWNER' } as never);
      return orgBConsole.promise as never;
    });

    setTenant('org-a', 'First Company');
    const { rerender } = render(<BusinessOwnerHome />);

    expect(await screen.findByText('Org A private work')).toBeInTheDocument();

    setTenant('org-b', 'Second Company');
    rerender(<BusinessOwnerHome />);

    // The render-time tenant binding must hide A before B's effect/request has
    // completed. Waiting for the effect would permit a one-frame privacy leak.
    expect(screen.getByRole('heading', { name: 'Second Company' })).toBeInTheDocument();
    expect(screen.queryByText('Org A private work')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/loading what aureus is carrying/i);

    await act(async () => {
      orgBList.resolve([responsibility('b-work', 'Org B current work')]);
      orgBConsole.resolve({ membershipRole: 'VIEWER' });
      await orgBList.promise;
      await orgBConsole.promise;
    });

    expect(await screen.findByText('Org B current work')).toBeInTheDocument();
    expect(screen.queryByText('Org A private work')).not.toBeInTheDocument();
  });

  it('discards a late prior-tenant response and prior-tenant role after switching businesses', async () => {
    const orgAList = deferred<BusinessResponsibilityDto[]>();
    const orgAConsole = deferred<{ membershipRole: string }>();

    mockList.mockImplementation((_token, organizationId) => {
      if (organizationId === 'org-a') return orgAList.promise;
      return Promise.resolve([responsibility('b-work', 'Org B current work')]);
    });
    mockConsole.mockImplementation((_token, organizationId) => {
      if (organizationId === 'org-a') return orgAConsole.promise as never;
      return Promise.resolve({ membershipRole: 'VIEWER' } as never);
    });
    mockEvidence.mockResolvedValue(receipt('b-work', 'Org B current work'));

    setTenant('org-a', 'First Company');
    const { rerender } = render(<BusinessOwnerHome />);

    await waitFor(() => expect(mockList).toHaveBeenCalledWith('token', 'org-a'));

    setTenant('org-b', 'Second Company');
    rerender(<BusinessOwnerHome />);

    expect(await screen.findByText('Org B current work')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Second Company' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Org B current work/i }));
    const detail = await screen.findByRole('complementary', { name: /Org B current work/i });
    expect(within(detail).queryByRole('button', { name: /confirm this is done/i })).toBeNull();

    await act(async () => {
      orgAList.resolve([responsibility('a-private', 'Org A private work')]);
      orgAConsole.resolve({ membershipRole: 'OWNER' });
      await orgAList.promise;
      await orgAConsole.promise;
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryByText('Org A private work')).not.toBeInTheDocument();
      expect(screen.getAllByText('Org B current work').length).toBeGreaterThan(0);
    });
    expect(screen.getByRole('heading', { name: 'Second Company' })).toBeInTheDocument();
    expect(within(detail).queryByRole('button', { name: /confirm this is done/i })).toBeNull();
  });
});
