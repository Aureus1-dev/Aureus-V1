'use client';

import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import {
  connectProvider as connectProviderApi,
  listConnectedProviders,
  revokeProvider as revokeProviderApi,
  type ConnectedProviderType,
  type ConnectionAttemptDto,
  type ProviderCatalogItemDto,
} from '../../lib/api/connected-accounts';
import {
  deleteDocument as deleteDocumentApi,
  listDocuments,
  summarizeDocument as summarizeDocumentApi,
  updateDocument as updateDocumentApi,
  uploadDocument as uploadDocumentApi,
  type DocumentDto,
  type ListDocumentsParams,
  type UpdateDocumentInput,
  type UploadDocumentInput,
} from '../../lib/api/documents';
import { listStewardActivity, type ActivityLogDto, type ListActivityParams } from '../../lib/api/steward-activity';
import { ApiError, NetworkError } from '../../lib/api/errors';
import { useSession } from '../session/SessionContext';

export type ConnectedExperiencesErrorKind = 'authentication' | 'rate-limited' | 'unavailable' | 'validation' | 'network' | 'unknown';

export interface ConnectedExperiencesError {
  kind: ConnectedExperiencesErrorKind;
  message: string;
  retryable: boolean;
}

interface ResultsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface State {
  providers: ProviderCatalogItemDto[];
  isLoadingProviders: boolean;
  connectingProviderType: ConnectedProviderType | null;
  lastConnectionAttemptByProvider: Record<string, ConnectionAttemptDto>;

  documents: DocumentDto[];
  documentsMeta: ResultsMeta | null;
  isLoadingDocuments: boolean;
  isLoadingMoreDocuments: boolean;
  documentsById: Record<string, DocumentDto>;
  summarizingDocumentId: string | null;

  activity: ActivityLogDto[];
  activityMeta: ResultsMeta | null;
  isLoadingActivity: boolean;

  error: ConnectedExperiencesError | null;
}

type Action =
  | { type: 'providers/loading' }
  | { type: 'providers/loaded'; providers: ProviderCatalogItemDto[] }
  | { type: 'connect/start'; providerType: ConnectedProviderType }
  | { type: 'connect/success'; providerType: ConnectedProviderType; attempt: ConnectionAttemptDto; providers: ProviderCatalogItemDto[] }
  | { type: 'revoke/success'; providers: ProviderCatalogItemDto[] }
  | { type: 'documents/loading' }
  | { type: 'documents/loaded'; documents: DocumentDto[]; meta: ResultsMeta }
  | { type: 'documents/more/loading' }
  | { type: 'documents/more/loaded'; documents: DocumentDto[]; meta: ResultsMeta }
  | { type: 'document/upserted'; document: DocumentDto }
  | { type: 'document/removed'; documentId: string }
  | { type: 'document/summarize/start'; documentId: string }
  | { type: 'document/summarize/done' }
  | { type: 'activity/loading' }
  | { type: 'activity/loaded'; activity: ActivityLogDto[]; meta: ResultsMeta }
  | { type: 'error'; error: ConnectedExperiencesError }
  | { type: 'error/clear' };

const initialState: State = {
  providers: [],
  isLoadingProviders: false,
  connectingProviderType: null,
  lastConnectionAttemptByProvider: {},

  documents: [],
  documentsMeta: null,
  isLoadingDocuments: false,
  isLoadingMoreDocuments: false,
  documentsById: {},
  summarizingDocumentId: null,

  activity: [],
  activityMeta: null,
  isLoadingActivity: false,

  error: null,
};

function cacheDocuments(documentsById: Record<string, DocumentDto>, documents: DocumentDto[]): Record<string, DocumentDto> {
  const next = { ...documentsById };
  for (const document of documents) next[document.id] = document;
  return next;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'providers/loading':
      return { ...state, isLoadingProviders: true, error: null };
    case 'providers/loaded':
      return { ...state, isLoadingProviders: false, providers: action.providers };
    case 'connect/start':
      return { ...state, connectingProviderType: action.providerType, error: null };
    case 'connect/success':
      return {
        ...state,
        connectingProviderType: null,
        providers: action.providers,
        lastConnectionAttemptByProvider: { ...state.lastConnectionAttemptByProvider, [action.providerType]: action.attempt },
      };
    case 'revoke/success':
      return { ...state, providers: action.providers };
    case 'documents/loading':
      return { ...state, isLoadingDocuments: true, error: null };
    case 'documents/loaded':
      return {
        ...state,
        isLoadingDocuments: false,
        documents: action.documents,
        documentsMeta: action.meta,
        documentsById: cacheDocuments(state.documentsById, action.documents),
      };
    case 'documents/more/loading':
      return { ...state, isLoadingMoreDocuments: true };
    case 'documents/more/loaded':
      return {
        ...state,
        isLoadingMoreDocuments: false,
        documents: [...state.documents, ...action.documents],
        documentsMeta: action.meta,
        documentsById: cacheDocuments(state.documentsById, action.documents),
      };
    case 'document/upserted': {
      const exists = state.documents.some((d) => d.id === action.document.id);
      return {
        ...state,
        documents: exists ? state.documents.map((d) => (d.id === action.document.id ? action.document : d)) : [action.document, ...state.documents],
        documentsById: cacheDocuments(state.documentsById, [action.document]),
      };
    }
    case 'document/removed': {
      const { [action.documentId]: _removed, ...rest } = state.documentsById;
      return {
        ...state,
        documents: state.documents.filter((d) => d.id !== action.documentId),
        documentsById: rest,
      };
    }
    case 'document/summarize/start':
      return { ...state, summarizingDocumentId: action.documentId, error: null };
    case 'document/summarize/done':
      return { ...state, summarizingDocumentId: null };
    case 'activity/loading':
      return { ...state, isLoadingActivity: true, error: null };
    case 'activity/loaded':
      return { ...state, isLoadingActivity: false, activity: action.activity, activityMeta: action.meta };
    case 'error':
      return {
        ...state,
        isLoadingProviders: false,
        connectingProviderType: null,
        isLoadingDocuments: false,
        isLoadingMoreDocuments: false,
        summarizingDocumentId: null,
        isLoadingActivity: false,
        error: action.error,
      };
    case 'error/clear':
      return { ...state, error: null };
    default:
      return state;
  }
}

function classifyError(error: unknown): ConnectedExperiencesError {
  if (error instanceof ApiError) {
    if (error.isAuthenticationRequired) return { kind: 'authentication', message: error.message, retryable: false };
    if (error.isRateLimited) return { kind: 'rate-limited', message: error.message, retryable: true };
    if (error.isServiceUnavailable) return { kind: 'unavailable', message: error.message, retryable: true };
    if (error.isValidationError) return { kind: 'validation', message: error.message, retryable: false };
    return { kind: 'unknown', message: error.message, retryable: error.retryable };
  }
  if (error instanceof NetworkError) return { kind: 'network', message: error.message, retryable: true };
  return { kind: 'unknown', message: 'Something unexpected happened.', retryable: true };
}

interface ConnectedExperiencesContextValue {
  state: State;
  loadProviders: () => Promise<void>;
  connectProvider: (providerType: ConnectedProviderType) => Promise<ConnectionAttemptDto | null>;
  revokeProvider: (providerType: ConnectedProviderType) => Promise<void>;
  loadDocuments: (params?: ListDocumentsParams) => Promise<void>;
  loadMoreDocuments: () => Promise<void>;
  uploadDocument: (input: UploadDocumentInput) => Promise<DocumentDto | null>;
  updateDocument: (id: string, input: UpdateDocumentInput) => Promise<void>;
  summarizeDocument: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  loadActivity: (params?: ListActivityParams) => Promise<void>;
  clearError: () => void;
}

const ConnectedExperiencesContext = createContext<ConnectedExperiencesContextValue | null>(null);

export function ConnectedExperiencesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadProviders = useCallback(async () => {
    if (!session.accessToken) return;
    dispatch({ type: 'providers/loading' });
    try {
      const providers = await listConnectedProviders(session.accessToken);
      dispatch({ type: 'providers/loaded', providers });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken]);

  const connectProvider = useCallback(
    async (providerType: ConnectedProviderType): Promise<ConnectionAttemptDto | null> => {
      if (!session.accessToken) return null;
      dispatch({ type: 'connect/start', providerType });
      try {
        const attempt = await connectProviderApi(session.accessToken, providerType);
        const providers = await listConnectedProviders(session.accessToken);
        dispatch({ type: 'connect/success', providerType, attempt, providers });
        return attempt;
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
        return null;
      }
    },
    [session.accessToken],
  );

  const revokeProvider = useCallback(
    async (providerType: ConnectedProviderType) => {
      if (!session.accessToken) return;
      try {
        await revokeProviderApi(session.accessToken, providerType);
        const providers = await listConnectedProviders(session.accessToken);
        dispatch({ type: 'revoke/success', providers });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const loadDocuments = useCallback(
    async (params: ListDocumentsParams = {}) => {
      if (!session.accessToken) return;
      dispatch({ type: 'documents/loading' });
      try {
        const result = await listDocuments(session.accessToken, params);
        dispatch({
          type: 'documents/loaded',
          documents: result.data,
          meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
        });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const loadMoreDocuments = useCallback(async () => {
    if (!session.accessToken || !state.documentsMeta || state.isLoadingMoreDocuments) return;
    if (state.documentsMeta.page >= state.documentsMeta.totalPages) return;
    dispatch({ type: 'documents/more/loading' });
    try {
      const nextPage = state.documentsMeta.page + 1;
      const result = await listDocuments(session.accessToken, { page: nextPage });
      dispatch({
        type: 'documents/more/loaded',
        documents: result.data,
        meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
      });
    } catch (error) {
      dispatch({ type: 'error', error: classifyError(error) });
    }
  }, [session.accessToken, state.documentsMeta, state.isLoadingMoreDocuments]);

  const uploadDocument = useCallback(
    async (input: UploadDocumentInput): Promise<DocumentDto | null> => {
      if (!session.accessToken) return null;
      try {
        const document = await uploadDocumentApi(session.accessToken, input);
        dispatch({ type: 'document/upserted', document });
        return document;
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
        return null;
      }
    },
    [session.accessToken],
  );

  const updateDocument = useCallback(
    async (id: string, input: UpdateDocumentInput) => {
      if (!session.accessToken) return;
      try {
        const document = await updateDocumentApi(session.accessToken, id, input);
        dispatch({ type: 'document/upserted', document });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const summarizeDocument = useCallback(
    async (id: string) => {
      if (!session.accessToken) return;
      dispatch({ type: 'document/summarize/start', documentId: id });
      try {
        const document = await summarizeDocumentApi(session.accessToken, id);
        dispatch({ type: 'document/upserted', document });
        dispatch({ type: 'document/summarize/done' });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      if (!session.accessToken) return;
      try {
        await deleteDocumentApi(session.accessToken, id);
        dispatch({ type: 'document/removed', documentId: id });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const loadActivity = useCallback(
    async (params: ListActivityParams = {}) => {
      if (!session.accessToken) return;
      dispatch({ type: 'activity/loading' });
      try {
        const result = await listStewardActivity(session.accessToken, params);
        dispatch({
          type: 'activity/loaded',
          activity: result.data,
          meta: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages },
        });
      } catch (error) {
        dispatch({ type: 'error', error: classifyError(error) });
      }
    },
    [session.accessToken],
  );

  const clearError = useCallback(() => dispatch({ type: 'error/clear' }), []);

  const value = useMemo(
    () => ({
      state,
      loadProviders,
      connectProvider,
      revokeProvider,
      loadDocuments,
      loadMoreDocuments,
      uploadDocument,
      updateDocument,
      summarizeDocument,
      deleteDocument,
      loadActivity,
      clearError,
    }),
    [
      state,
      loadProviders,
      connectProvider,
      revokeProvider,
      loadDocuments,
      loadMoreDocuments,
      uploadDocument,
      updateDocument,
      summarizeDocument,
      deleteDocument,
      loadActivity,
      clearError,
    ],
  );

  return <ConnectedExperiencesContext.Provider value={value}>{children}</ConnectedExperiencesContext.Provider>;
}

export function useConnectedExperiences(): ConnectedExperiencesContextValue {
  const context = useContext(ConnectedExperiencesContext);
  if (!context) {
    throw new Error('useConnectedExperiences must be used within a ConnectedExperiencesProvider');
  }
  return context;
}
