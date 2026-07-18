import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { ResourcesProvider } from '../../../state/resources/ResourcesContext';
import { ResourcesPage } from './ResourcesPage';
import * as resourcesApi from '../../../lib/api/resources';
import * as savedResourcesApi from '../../../lib/api/saved-resources';
import type { ResourceDto } from '../../../lib/api/resources';
import type { SavedResourceDto } from '../../../lib/api/saved-resources';

jest.mock('../../../lib/api/resources');
jest.mock('../../../lib/api/saved-resources');

const mockedApi = resourcesApi as jest.Mocked<typeof resourcesApi>;
const mockedSavedApi = savedResourcesApi as jest.Mocked<typeof savedResourcesApi>;

function makeResource(o: Partial<ResourceDto> = {}): ResourceDto {
  return {
    id: 'res-1', resourceRef: 'AUR-RES-000001', title: 'Food Bank', shortDescription: 'Free groceries',
    fullDescription: 'A local food bank.', category: 'COMMUNITY_ORGANIZATION', resourceType: 'SERVICE', tags: [],
    organizationName: 'Central Food Bank', officialSourceUrl: 'https://example.com', contactName: null,
    contactEmail: null, contactPhone: null, location: null, country: null, state: null, city: null, isRemote: false,
    eligibilityNotes: null, status: 'ACTIVE', verificationStatus: 'VERIFIED', rejectionReason: null,
    confidenceScore: 90, freshnessScore: 90, datePublished: null, dateLastVerified: null, sourceName: 'Admin',
    sourceUrl: null, sourceType: 'ADMIN_ENTRY', ownerId: 'u-1', submittedById: 'u-1', createdById: 'u-1',
    lastUpdatedById: 'u-1', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null,
    ...o,
  };
}

function makeSaved(o: Partial<SavedResourceDto> = {}): SavedResourceDto {
  return {
    id: 'sv-1', userId: 'member-1', resourceId: 'res-1', isFavorite: false, notes: null,
    savedAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...o,
  };
}

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderPage() {
  return render(
    <SessionProvider>
      <ResourcesProvider>
        <SignedInAs>
          <ResourcesPage />
        </SignedInAs>
      </ResourcesProvider>
    </SessionProvider>,
  );
}

describe('ResourcesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSavedApi.listSavedResources.mockResolvedValue([]);
    mockedApi.getResource.mockResolvedValue(makeResource());
  });

  it('renders search results on the Search tab by default', async () => {
    mockedApi.listResources.mockResolvedValue({ data: [makeResource()], total: 1, page: 1, limit: 20, totalPages: 1 });

    renderPage();

    expect(await screen.findByText('Food Bank')).toBeInTheDocument();
    expect(screen.getByText('Central Food Bank')).toBeInTheDocument();
  });

  it('saves and unsaves a resource', async () => {
    mockedApi.listResources.mockResolvedValue({ data: [makeResource()], total: 1, page: 1, limit: 20, totalPages: 1 });
    mockedSavedApi.saveResource.mockResolvedValue(makeSaved());
    mockedSavedApi.removeSavedResource.mockResolvedValue(undefined);

    renderPage();
    await screen.findByText('Food Bank');

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(mockedSavedApi.saveResource).toHaveBeenCalledWith('token-123', 'member-1', 'res-1'));
    expect(await screen.findByRole('button', { name: 'Saved' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Saved' }));
    await waitFor(() => expect(mockedSavedApi.removeSavedResource).toHaveBeenCalledWith('token-123', 'member-1', 'res-1'));
  });

  it('switches to the Saved tab and shows a saved resource', async () => {
    mockedApi.listResources.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    mockedSavedApi.listSavedResources.mockResolvedValue([makeSaved()]);
    mockedApi.getResource.mockResolvedValue(makeResource());

    renderPage();
    await screen.findByText('No resources found');

    await userEvent.click(screen.getByRole('tab', { name: 'Saved' }));

    expect(await screen.findByText('Food Bank')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Favorite/i })).toBeInTheDocument();
  });

  it('shows a sign-in prompt when unauthenticated', () => {
    render(
      <SessionProvider>
        <ResourcesProvider>
          <ResourcesPage />
        </ResourcesProvider>
      </SessionProvider>,
    );

    expect(screen.getByText('Sign in to browse Resources')).toBeInTheDocument();
    expect(mockedApi.listResources).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    mockedApi.listResources.mockResolvedValue({ data: [makeResource()], total: 1, page: 1, limit: 20, totalPages: 1 });
    const { container } = renderPage();
    await screen.findByText('Food Bank');

    expect(await axe(container)).toHaveNoViolations();
  });
});
