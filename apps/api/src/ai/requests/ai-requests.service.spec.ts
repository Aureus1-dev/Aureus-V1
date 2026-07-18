import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { AiCapability, AiProvider, AiRequestStatus, UserRole } from '@prisma/client';
import { AiRequestsService } from './ai-requests.service';
import { AiOperationalConfigService } from './ai-operational-config.service';
import { AI_REQUEST_REPOSITORY, IAiRequestRepository } from './repositories/ai-request.repository.interface';
import { AI_PROVIDER, IAiProvider } from '../providers/ai-provider.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { AiOperationalConfig, AiRequest } from '@prisma/client';

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

const makeConfig = (o: Partial<AiOperationalConfig> = {}): AiOperationalConfig => ({
  id: 'singleton', emergencyStop: false, globalDailyBudgetUsd: 50, userDailyBudgetUsd: 2,
  updatedById: null, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IAiRequestRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), sumCostSince: jest.fn(), summarySince: jest.fn(),
};
const mockProvider: jest.Mocked<IAiProvider> = {
  provider: AiProvider.STUB,
  complete: jest.fn(),
};
const mockOperationalConfig = {
  getEffective: jest.fn(),
} as unknown as jest.Mocked<AiOperationalConfigService>;

describe('AiRequestsService', () => {
  let service: AiRequestsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        AiRequestsService,
        { provide: AI_REQUEST_REPOSITORY, useValue: mockRepo },
        { provide: AI_PROVIDER, useValue: mockProvider },
        { provide: AiOperationalConfigService, useValue: mockOperationalConfig },
      ],
    }).compile();
    service = m.get(AiRequestsService);
    jest.clearAllMocks();
    mockOperationalConfig.getEffective.mockResolvedValue(makeConfig());
    mockRepo.sumCostSince.mockResolvedValue(0);
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

    // ── AI spend limits, quotas, emergency budget controls (PR-002, live-editable in PR-003) ──

    it('blocks the call without hitting the provider when the emergency stop is set', async () => {
      mockOperationalConfig.getEffective.mockResolvedValue(makeConfig({ emergencyStop: true }));

      await expect(service.runCompletion({
        userId: USER.id, capability: AiCapability.QUESTION_ANSWERING,
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow(ServiceUnavailableException);

      expect(mockProvider.complete).not.toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('blocks the call once the platform-wide daily budget is reached', async () => {
      mockOperationalConfig.getEffective.mockResolvedValue(makeConfig({ globalDailyBudgetUsd: 10 }));
      mockRepo.sumCostSince.mockResolvedValueOnce(10);

      await expect(service.runCompletion({
        userId: USER.id, capability: AiCapability.QUESTION_ANSWERING,
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow(ServiceUnavailableException);

      expect(mockProvider.complete).not.toHaveBeenCalled();
    });

    it('blocks the call with ForbiddenException once the per-user daily quota is reached', async () => {
      mockOperationalConfig.getEffective.mockResolvedValue(makeConfig({ userDailyBudgetUsd: 1 }));
      mockRepo.sumCostSince.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

      await expect(service.runCompletion({
        userId: USER.id, capability: AiCapability.QUESTION_ANSWERING,
        messages: [{ role: 'user', content: 'Hi' }],
      })).rejects.toThrow(ForbiddenException);

      expect(mockProvider.complete).not.toHaveBeenCalled();
    });

    it('allows the call when spend is below every ceiling', async () => {
      mockProvider.complete.mockResolvedValue({
        content: 'Hello!', provider: AiProvider.STUB, model: 'stub', promptTokens: 10, completionTokens: 5,
      });
      mockRepo.create.mockResolvedValue(makeRequest());
      mockRepo.sumCostSince.mockResolvedValue(0.01);

      await expect(service.runCompletion({
        userId: USER.id, capability: AiCapability.QUESTION_ANSWERING,
        messages: [{ role: 'user', content: 'Hi' }],
      })).resolves.toBeDefined();
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

  describe('findAllAdmin', () => {
    it('forbids a non-admin caller', async () => {
      await expect(service.findAllAdmin({ page: 1, limit: 20 }, USER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.findAll).not.toHaveBeenCalled();
    });

    it('lists platform-wide, unscoped by default, for an Administrator', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [makeRequest()], total: 1, page: 1, limit: 20 });
      const result = await service.findAllAdmin({ page: 1, limit: 20 }, ADMIN);

      expect(mockRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20, userId: undefined }),
      );
      expect(result.total).toBe(1);
    });

    it('passes through an explicit userId filter for an Administrator', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      await service.findAllAdmin({ page: 1, limit: 20, userId: OTHER_USER.id }, ADMIN);
      expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({ userId: OTHER_USER.id }));
    });
  });

  describe('getSpendSummary', () => {
    it('forbids a non-admin caller', async () => {
      await expect(service.getSpendSummary(USER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.summarySince).not.toHaveBeenCalled();
    });

    it('returns the platform-wide spend summary with the current budget ceiling for an Administrator', async () => {
      mockRepo.summarySince.mockResolvedValue({ totalCostUsd: 3.5, requestCount: 10, failedCount: 1 });
      mockOperationalConfig.getEffective.mockResolvedValue(makeConfig({ globalDailyBudgetUsd: 50 }));

      const result = await service.getSpendSummary(ADMIN);

      expect(result.totalCostUsd).toBe(3.5);
      expect(result.requestCount).toBe(10);
      expect(result.failedCount).toBe(1);
      expect(result.globalDailyBudgetUsd).toBe(50);
      expect(result.emergencyStop).toBe(false);
    });
  });
});
