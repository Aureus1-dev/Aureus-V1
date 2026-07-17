import { Document, DocumentCategory } from '@prisma/client';

export const DOCUMENT_REPOSITORY = 'DOCUMENT_REPOSITORY';

export interface CreateDocumentInput {
  userId: string;
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

export interface DocumentQueryParams {
  page: number;
  limit: number;
  userId: string;
  category?: DocumentCategory;
  q?: string;
}

export interface PaginatedDocuments {
  data: Document[];
  total: number;
  page: number;
  limit: number;
}

export interface IDocumentRepository {
  create(data: CreateDocumentInput): Promise<Document>;
  setRef(id: string, documentRef: string): Promise<Document>;
  findById(id: string): Promise<Document | null>;
  findAll(params: DocumentQueryParams): Promise<PaginatedDocuments>;
  update(id: string, data: UpdateDocumentInput): Promise<Document>;
  setSummary(id: string, aiSummary: string): Promise<Document>;
  softDelete(id: string): Promise<Document>;
}
