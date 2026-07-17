import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DocumentCategory, UserRole } from '@prisma/client';
import type { Document } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { DOCUMENT_REPOSITORY, IDocumentRepository } from './repositories/document.repository.interface';
import { AiRequestsService } from '../../ai/requests/ai-requests.service';
import { StewardActivityLogService } from '../activity/steward-activity-log.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const OWNER: AuthenticatedUser = { id: 'user-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const OTHER: AuthenticatedUser = { id: 'user-002', email: 'o@example.com', roles: [UserRole.MEMBER] };
const NOW = new Date('2026-01-01T00:00:00.000Z');

const makeDocument = (o: Partial<Document> = {}): Document => ({
  id: 'doc-001', sequenceNumber: 1, documentRef: null, userId: OWNER.id,
  title: 'Lease Agreement', originalFilename: 'lease.pdf', mimeType: 'application/pdf', sizeBytes: 1024,
  storageRef: 'stub://lease.pdf', category: DocumentCategory.LEASE, extractedText: null,
  aiSummary: null, aiSummaryGeneratedAt: null,
  uploadedAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRepo: jest.Mocked<IDocumentRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findAll: jest.fn(),
  update: jest.fn(), setSummary: jest.fn(), softDelete: jest.fn(),
};

const mockAiRequests = { runCompletion: jest.fn() };
const mockActivityLog = { record: jest.fn() };

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: DOCUMENT_REPOSITORY, useValue: mockRepo },
        { provide: AiRequestsService, useValue: mockAiRequests },
        { provide: StewardActivityLogService, useValue: mockActivityLog },
      ],
    }).compile();
    service = m.get(DocumentsService);
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('creates a document, sets a stable ref, and logs DOCUMENT_UPLOADED', async () => {
      mockRepo.create.mockResolvedValue(makeDocument());
      mockRepo.setRef.mockResolvedValue(makeDocument({ documentRef: 'AUR-DOC-000001' }));

      const result = await service.upload(
        { title: 'Lease Agreement', originalFilename: 'lease.pdf', mimeType: 'application/pdf', sizeBytes: 1024, storageRef: 'stub://lease.pdf' },
        OWNER,
      );

      expect(result.documentRef).toBe('AUR-DOC-000001');
      expect(mockRepo.setRef).toHaveBeenCalledWith('doc-001', 'AUR-DOC-000001');
      expect(mockActivityLog.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'DOCUMENT_UPLOADED', actor: 'MEMBER' }));
    });
  });

  describe('ownership', () => {
    it('findById throws NotFoundException for a missing document', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('missing', OWNER)).rejects.toThrow(NotFoundException);
    });

    it('findById throws ForbiddenException for another member\'s document', async () => {
      mockRepo.findById.mockResolvedValue(makeDocument());
      await expect(service.findById('doc-001', OTHER)).rejects.toThrow(ForbiddenException);
    });

    it('findById returns the document for its owner', async () => {
      mockRepo.findById.mockResolvedValue(makeDocument());
      const result = await service.findById('doc-001', OWNER);
      expect(result.id).toBe('doc-001');
    });
  });

  describe('summarize', () => {
    it('throws BadRequestException when the document has no extracted text', async () => {
      mockRepo.findById.mockResolvedValue(makeDocument({ extractedText: null }));
      await expect(service.summarize('doc-001', OWNER)).rejects.toThrow(BadRequestException);
      expect(mockAiRequests.runCompletion).not.toHaveBeenCalled();
    });

    it('summarizes real extracted text via AiRequestsService and logs DOCUMENT_SUMMARIZED', async () => {
      mockRepo.findById.mockResolvedValue(makeDocument({ extractedText: 'Lease term: 12 months. Rent: $1500/mo.' }));
      mockAiRequests.runCompletion.mockResolvedValue({ content: 'A 12-month lease at $1500/mo.', requestId: 'req-001' });
      mockRepo.setSummary.mockResolvedValue(makeDocument({
        extractedText: 'Lease term: 12 months. Rent: $1500/mo.',
        aiSummary: 'A 12-month lease at $1500/mo.', aiSummaryGeneratedAt: NOW,
      }));

      const result = await service.summarize('doc-001', OWNER);

      expect(result.aiSummary).toBe('A 12-month lease at $1500/mo.');
      expect(mockAiRequests.runCompletion).toHaveBeenCalledWith(expect.objectContaining({ userId: OWNER.id, capability: 'DOCUMENT_SUMMARY' }));
      expect(mockActivityLog.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'DOCUMENT_SUMMARIZED', actor: 'AI_STEWARD' }));
    });

    it('throws ForbiddenException when a non-owner requests a summary', async () => {
      mockRepo.findById.mockResolvedValue(makeDocument({ extractedText: 'text' }));
      await expect(service.summarize('doc-001', OTHER)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('soft-deletes and logs DOCUMENT_DELETED', async () => {
      mockRepo.findById.mockResolvedValue(makeDocument());
      mockRepo.softDelete.mockResolvedValue(makeDocument({ deletedAt: NOW }));

      await service.remove('doc-001', OWNER);

      expect(mockRepo.softDelete).toHaveBeenCalledWith('doc-001');
      expect(mockActivityLog.record).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'DOCUMENT_DELETED', actor: 'MEMBER' }));
    });

    it('throws ForbiddenException when a non-owner attempts deletion', async () => {
      mockRepo.findById.mockResolvedValue(makeDocument());
      await expect(service.remove('doc-001', OTHER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });
  });
});
