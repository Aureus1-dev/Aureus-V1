import { apiRequest } from './http';

/** DTO shapes mirror `apps/api/src/connected-experiences/documents/dto/*` exactly (FPB-009 §8). */
export type DocumentCategory =
  | 'IDENTIFICATION'
  | 'LEASE'
  | 'FINANCIAL'
  | 'EMPLOYMENT'
  | 'EDUCATION'
  | 'MEDICAL'
  | 'LEGAL'
  | 'OTHER';

export interface DocumentDto {
  id: string;
  documentRef: string | null;
  userId: string;
  title: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageRef: string;
  category: DocumentCategory;
  extractedText: string | null;
  aiSummary: string | null;
  aiSummaryGeneratedAt: string | null;
  uploadedAt: string;
  updatedAt: string;
}

export interface PaginatedDocumentsDto {
  data: DocumentDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UploadDocumentInput {
  title: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageRef: string;
  category?: DocumentCategory;
  extractedText?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  category?: DocumentCategory;
  extractedText?: string;
}

export interface ListDocumentsParams {
  page?: number;
  limit?: number;
  category?: DocumentCategory;
  q?: string;
}

export function listDocuments(accessToken: string, params: ListDocumentsParams = {}): Promise<PaginatedDocumentsDto> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.category) query.set('category', params.category);
  if (params.q) query.set('q', params.q);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<PaginatedDocumentsDto>(`/documents${suffix}`, { accessToken });
}

export function getDocument(accessToken: string, id: string): Promise<DocumentDto> {
  return apiRequest<DocumentDto>(`/documents/${id}`, { accessToken });
}

export function uploadDocument(accessToken: string, input: UploadDocumentInput): Promise<DocumentDto> {
  return apiRequest<DocumentDto>('/documents', { method: 'POST', accessToken, body: input });
}

export function updateDocument(accessToken: string, id: string, input: UpdateDocumentInput): Promise<DocumentDto> {
  return apiRequest<DocumentDto>(`/documents/${id}`, { method: 'PATCH', accessToken, body: input });
}

export function summarizeDocument(accessToken: string, id: string): Promise<DocumentDto> {
  return apiRequest<DocumentDto>(`/documents/${id}/summarize`, { method: 'POST', accessToken });
}

export function deleteDocument(accessToken: string, id: string): Promise<void> {
  return apiRequest<void>(`/documents/${id}`, { method: 'DELETE', accessToken });
}
