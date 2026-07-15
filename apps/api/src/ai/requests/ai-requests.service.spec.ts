import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AiCapability, AiProvider, AiRequestStatus, UserRole } from '@prisma/client';
import { AiRequestsService } from './ai-requests.service';
import { AI_REQUEST_REPOSITORY, IAiRequestRepository } from './repositories/ai-request.repository.interface';
import { AI_PROVIDER, IAiProvider } from '../providers/ai-provider.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { AiRequest } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const USER: AuthenticatedUser = { id: 'user-001', email: 'user@example.com', roles: [UserRole.MEMBER] };
const OTHER_USER: AuthenticatedUser = { id: 'other-001', email: 'other@example.com', roles: [UserRole.MEMBER] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeRequest = (o: Partial<AiRequest> = {}): AiRequest => ({
  id: 'req-001', userId: USER.id, conversationId: null,
  capability: AiCapability.QUESTION_ANSWERING, provider: AiProvider.STUB, model: 'stub',
  promptTokens: 10, completionTokens: 5, costUsd: 0, latencyMs: 12,
  status: AiRequestStatus.SUCCESS, errorMessage: null, createdAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IAiRequestRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(),
};
const mockProvider: jest.Mocked<IAiProvider> = {
  provider: AiProvider.STUB,
  complete: jest.fn(),
};

describe('AiRequestsService', () => {
  let service: AiRequestsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        AiRequestsService,
        { provide: AI_REQUEST_REPOSITORY, useValue: mockRepo },
        { provide: AI_PROVIDER, useValue: mockProvider },
      ],
    }).compile();
    service = m.get(AiRequestsService);
    jest.clearAllMocks();
  });

  describe('runCompletion', () => {
    it('calls the provider, logs a SUCCESS AiRequest, and returns the content', async () => {
      mockProvider.complete.mockResolvedValue({
        content: 'Hello!', provider: AiProvider.STUB, model: 'stub', promptTokens: 10, completionTokens: 5,
      });
      mockRepo.create.mockResolvedValue(makeRequest());

      const result = await service.runCompletion({
        userId: USER.id, capability: AiCapability.QUESTION_ANSWERING,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.content).toBe('Hello!');
      expect(result.requestId).toBe('req-001');
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: USER.id, capability: AiCapability.QUESTION_ANSWERING, status: AiRequestStatus.SUCCESS,
      }));
    });

    it('logs a FAILED AiRequest and throws ServiceUnavailableException when the provider errors', async () => {
      mockProvider.complete.mockRejectedValue(new Error('upstream timeout'));
      mockRepo.create.mockResolvedValue(makeRequest({ status: AiRequestStatus.FAILED }));

      await expect(service.runCompletion({
        userId: USER.id, capability: AiCapability.QUESTION_ANSWERING,
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow(ServiceUnavailableException);

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        status: AiRequestStatus.FAILED, errorMessage: 'upstream timeout',
      }));
    });
  });

  describe('findById — access control', () => {
    it('allows the request owner', async () => {
      mockRepo.findById.mockResolvedValue(makeRequest());
      await expect(service.findById('req-001', USER)).resolves.toBeDefined();
    });

    it('allows an Administrator', async () => {
      mockRepo.findById.mockResolvedValue(makeRequest());
      await expect(service.findById('req-001', ADMIN)).resolves.toBeDefined();
    });

    it('forbids a non-owner, non-privileged caller', async () => {
      mockRepo.findById.mockResolvedValue(makeRequest());
      await expect(service.findById('req-001', OTHER_USER)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a missing request', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('ghost', USER)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMine', () => {
    it('scopes results to the caller', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      await service.findMine({ page: 1, limit: 20 }, USER);
      expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({ userId: USER.id }));
    });
  });
});
