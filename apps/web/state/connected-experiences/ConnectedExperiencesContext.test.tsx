import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { SessionProvider, useSession } from '../session/SessionContext';
import { ConnectedExperiencesProvider, useConnectedExperiences } from './ConnectedExperiencesContext';
import * as connectedAccountsApi from '../../lib/api/connected-accounts';
import * as documentsApi from '../../lib/api/documents';
import * as stewardActivityApi from '../../lib/api/steward-activity';
import type { DocumentDto } from '../../lib/api/documents';
import type { ProviderCatalogItemDto } from '../../lib/api/connected-accounts';

jest.mock('../../lib/api/connected-accounts');
jest.mock('../../lib/api/documents');
jest.mock('../../lib/api/steward-activity');

const mockedAccounts = connectedAccountsApi as jest.Mocked<typeof connectedAccountsApi>;
const mockedDocuments = documentsApi as jest.Mocked<typeof documentsApi>;
const mockedActivity = stewardActivityApi as jest.Mocked<typeof stewardActivityApi>;

function Harness({ onReady }: { onReady: (value: ReturnType<typeof useConnectedExperiences> & { setToken: () => void }) => void }) {
  const connectedExperiences = useConnectedExperiences();
  const { setSession, session } = useSession();

  useEffect(() => {
    onReady({
      ...connectedExperiences,
      setToken: () => setSession({ ...session, isAuthenticated: true, accessToken: 'token-123', memberId: 'member-1' }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedExperiences, session]);

  return null;
}

function renderHarness() {
  let api!: ReturnType<typeof useConnectedExperiences> & { setToken: () => void };
  render(
    <SessionProvider>
      <ConnectedExperiencesProvider>
        <Harness onReady={(value) => (api = value)} />
      </ConnectedExperiencesProvider>
    </SessionProvider>,
  );
  return () => api;
}

const NOW = 'x';

function makeDocument(o: Partial<DocumentDto> = {}): DocumentDto {
  return {
    id: 'doc-1', documentRef: 'AUR-DOC-000001', userId: 'member-1', title: 'Lease Agreement',
    originalFilename: 'lease.pdf', mimeType: 'application/pdf', sizeBytes: 2048, storageRef: 'local://lease.pdf',
    category: 'LEASE', extractedText: 'text', aiSummary: null, aiSummaryGeneratedAt: null,
    uploadedAt: NOW, updatedAt: NOW, ...o,
  };
}

const catalog: ProviderCatalogItemDto[] = [
  {
    providerType: 'GMAIL', displayName: 'Gmail', category: 'EMAIL',
    whatAureusCanAccess: 'x', whyItsNeeded: 'x', whatTheAiStewardCanDo: 'x', connectionState: 'COMING_SOON',
  },
];

describe('ConnectedExperiencesContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the provider catalog', async () => {
    mockedAccounts.listConnectedProviders.mockResolvedValue(catalog);
    const getApi = renderHarness();
    await act(async () => getApi().setToken());
    await act(async () => getApi().loadProviders());
    expect(getApi().state.providers).toEqual(catalog);
  });

  it('connect: never records an account when the provider reports COMING_SOON', async () => {
    mockedAccounts.connectProvider.mockResolvedValue({ providerType: 'GMAIL', status: 'COMING_SOON', message: 'Coming Soon.' });
    mockedAccounts.listConnectedProviders.mockResolvedValue(catalog);
    const getApi = renderHarness();
    await act(async () => getApi().setToken());

    const attempt = await act(async () => getApi().connectProvider('GMAIL'));

    expect(attempt?.status).toBe('COMING_SOON');
    expect(getApi().state.lastConnectionAttemptByProvider.GMAIL?.status).toBe('COMING_SOON');
    expect(getApi().state.connectingProviderType).toBeNull();
  });

  it('upload/summarize/delete keeps documentsById and the documents list in sync', async () => {
    mockedDocuments.uploadDocument.mockResolvedValue(makeDocument());
    mockedDocuments.summarizeDocument.mockResolvedValue(makeDocument({ aiSummary: 'A short summary.' }));
    mockedDocuments.deleteDocument.mockResolvedValue(undefined);

    const getApi = renderHarness();
    await act(async () => getApi().setToken());

    await act(async () => {
      await getApi().uploadDocument({
        title: 'Lease Agreement', originalFilename: 'lease.pdf', mimeType: 'application/pdf',
        sizeBytes: 2048, storageRef: 'local://lease.pdf',
      });
    });
    expect(getApi().state.documents).toHaveLength(1);
    expect(getApi().state.documentsById['doc-1'].title).toBe('Lease Agreement');

    await act(async () => getApi().summarizeDocument('doc-1'));
    expect(getApi().state.documentsById['doc-1'].aiSummary).toBe('A short summary.');
    expect(getApi().state.summarizingDocumentId).toBeNull();

    await act(async () => getApi().deleteDocument('doc-1'));
    expect(getApi().state.documents).toHaveLength(0);
    expect(getApi().state.documentsById['doc-1']).toBeUndefined();
  });

  it('loads Steward activity', async () => {
    mockedActivity.listStewardActivity.mockResolvedValue({
      data: [{
        id: 'log-1', userId: 'member-1', eventType: 'DOCUMENT_UPLOADED', actor: 'MEMBER',
        description: 'Uploaded "Lease Agreement".', connectedAccountId: null, documentId: 'doc-1', occurredAt: NOW,
      }],
      total: 1, page: 1, limit: 20, totalPages: 1,
    });
    const getApi = renderHarness();
    await act(async () => getApi().setToken());
    await act(async () => getApi().loadActivity());
    expect(getApi().state.activity).toHaveLength(1);
  });
});
