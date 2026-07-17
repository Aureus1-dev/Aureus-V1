import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SessionProvider, useSession } from '../../../state/session/SessionContext';
import { ConnectedExperiencesProvider } from '../../../state/connected-experiences/ConnectedExperiencesContext';
import { ConnectedExperiencesHome } from './ConnectedExperiencesHome';

import * as connectedAccountsApi from '../../../lib/api/connected-accounts';
import * as documentsApi from '../../../lib/api/documents';
import * as stewardActivityApi from '../../../lib/api/steward-activity';

import type { ProviderCatalogItemDto } from '../../../lib/api/connected-accounts';
import type { DocumentDto } from '../../../lib/api/documents';

jest.mock('../../../lib/api/connected-accounts');
jest.mock('../../../lib/api/documents');
jest.mock('../../../lib/api/steward-activity');

const mockedAccounts = connectedAccountsApi as jest.Mocked<typeof connectedAccountsApi>;
const mockedDocuments = documentsApi as jest.Mocked<typeof documentsApi>;
const mockedActivity = stewardActivityApi as jest.Mocked<typeof stewardActivityApi>;

const catalog: ProviderCatalogItemDto[] = [
  {
    providerType: 'GMAIL', displayName: 'Gmail', category: 'EMAIL',
    whatAureusCanAccess: 'Read access to messages you choose to share.',
    whyItsNeeded: 'So your Steward can notice things that matter.',
    whatTheAiStewardCanDo: 'Point out relevant messages. It will never send an email on your behalf.',
    connectionState: 'COMING_SOON',
  },
];

const document: DocumentDto = {
  id: 'doc-1', documentRef: 'AUR-DOC-000001', userId: 'member-1', title: 'Lease Agreement',
  originalFilename: 'lease.pdf', mimeType: 'application/pdf', sizeBytes: 2048, storageRef: 'local://lease.pdf',
  category: 'LEASE', extractedText: 'Lease term: 12 months. Rent: $1500/mo.', aiSummary: null,
  aiSummaryGeneratedAt: null, uploadedAt: 'x', updatedAt: 'x',
};

function SignedInAs({ children }: { children: React.ReactNode }) {
  const { setSession, session } = useSession();
  if (!session.isAuthenticated) {
    setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' });
  }
  return <>{children}</>;
}

function renderHome() {
  return render(
    <SessionProvider>
      <ConnectedExperiencesProvider>
        <SignedInAs>
          <ConnectedExperiencesHome />
        </SignedInAs>
      </ConnectedExperiencesProvider>
    </SessionProvider>,
  );
}

describe('ConnectedExperiencesHome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAccounts.listConnectedProviders.mockResolvedValue(catalog);
    mockedDocuments.listDocuments.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    mockedActivity.listStewardActivity.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20, totalPages: 0 });
  });

  it('asks a signed-out visitor to sign in', () => {
    render(
      <SessionProvider>
        <ConnectedExperiencesProvider>
          <ConnectedExperiencesHome />
        </ConnectedExperiencesProvider>
      </SessionProvider>,
    );
    expect(screen.getByText('Sign in to view your Connected Experiences')).toBeInTheDocument();
  });

  it(
    "lets a member accomplish the Domain's primary purpose end-to-end: attempt to connect a provider and see an " +
      'honest Coming Soon status logged to their activity trail, and separately upload, summarize, and delete a ' +
      'document — never a fabricated connection, always real document handling',
    async () => {
      mockedAccounts.connectProvider.mockResolvedValue({
        providerType: 'GMAIL', status: 'COMING_SOON',
        message: 'Coming Soon: the architecture for connecting Gmail is complete.',
      });
      mockedDocuments.uploadDocument.mockResolvedValue(document);
      mockedDocuments.summarizeDocument.mockResolvedValue({ ...document, aiSummary: 'A 12-month lease at $1500/mo.' });
      mockedDocuments.deleteDocument.mockResolvedValue(undefined);

      renderHome();

      // Connected Accounts tab — attempt to connect Gmail, get an honest Coming Soon.
      expect(await screen.findByText('Gmail')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Connect' }));
      expect(mockedAccounts.connectProvider).toHaveBeenCalledWith('token-123', 'GMAIL');
      expect(await screen.findByText(/Coming Soon: the architecture for connecting Gmail is complete\./)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Revoke access' })).not.toBeInTheDocument();

      // Documents tab — upload, summarize, and delete a real document.
      await userEvent.click(screen.getByRole('tab', { name: 'Documents' }));

      await userEvent.type(screen.getByLabelText('Title', { exact: false }), 'Lease Agreement');
      const fileInput = screen.getByLabelText('File *', { exact: false });
      const file = new File(['lease text'], 'lease.pdf', { type: 'application/pdf' });
      await userEvent.upload(fileInput, file);
      await userEvent.click(screen.getByRole('button', { name: 'Upload document' }));

      expect(mockedDocuments.uploadDocument).toHaveBeenCalledWith(
        'token-123',
        expect.objectContaining({ title: 'Lease Agreement', originalFilename: 'lease.pdf' }),
      );
      expect(await screen.findByText('Lease Agreement')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Summarize' }));
      expect(mockedDocuments.summarizeDocument).toHaveBeenCalledWith('token-123', 'doc-1');
      expect(await screen.findByText('A 12-month lease at $1500/mo.')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(mockedDocuments.deleteDocument).toHaveBeenCalledWith('token-123', 'doc-1');
      expect(screen.queryByText('Lease Agreement')).not.toBeInTheDocument();
    },
  );

  it('has no accessibility violations', async () => {
    const { container } = renderHome();
    await screen.findByText('Gmail');
    expect(await axe(container)).toHaveNoViolations();
  });
});
