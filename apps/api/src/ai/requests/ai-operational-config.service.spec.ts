import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { AiCapability, UserRole } from '@prisma/client';
import type { AiCapabilityBudget, AiOperationalConfig } from '@prisma/client';
import { AiOperationalConfigService } from './ai-operational-config.service';
import {
  AI_OPERATIONAL_CONFIG_REPOSITORY,
  IAiOperationalConfigRepository,
} from './repositories/ai-operational-config.repository.interface';
import {
  AI_CAPABILITY_BUDGET_REPOSITORY,
  IAiCapabilityBudgetRepository,
} from './repositories/ai-capability-budget.repository.interface';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'admin@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };
const MEMBER: AuthenticatedUser = { id: 'user-001', email: 'user@example.com', roles: [UserRole.MEMBER] };

const makeConfig = (o: Partial<AiOperationalConfig> = {}): AiOperationalConfig => ({
  id: 'singleton', emergencyStop: false, globalDailyBudgetUsd: 50, userDailyBudgetUsd: 2,
  updatedById: null, updatedAt: NOW, ...o,
});

const makeCapabilityBudget = (o: Partial<AiCapabilityBudget> = {}): AiCapabilityBudget => ({
  id: 'budget-001', capability: AiCapability.VOICE_CONVERSATION, dailyBudgetUsd: null, dailyRequestLimit: 50,
  updatedById: null, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IAiOperationalConfigRepository> = {
  getOrCreate: jest.fn(), update: jest.fn(),
};
const mockCapabilityBudgetRepo: jest.Mocked<IAiCapabilityBudgetRepository> = {
  findAll: jest.fn(), findByCapability: jest.fn(), upsert: jest.fn(), remove: jest.fn(),
};
const mockConfig = {
  get: jest.fn((_key: string, fallback?: unknown) => fallback),
} as unknown as jest.Mocked<ConfigService>;

describe('AiOperationalConfigService', () => {
  let service: AiOperationalConfigService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        AiOperationalConfigService,
        { provide: AI_OPERATIONAL_CONFIG_REPOSITORY, useValue: mockRepo },
        { provide: AI_CAPABILITY_BUDGET_REPOSITORY, useValue: mockCapabilityBudgetRepo },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = m.get(AiOperationalConfigService);
    jest.clearAllMocks();
    (mockConfig.get as jest.Mock).mockImplementation((_key: string, fallback?: unknown) => fallback);
  });

  describe('getEffective', () => {
    it('seeds the repository from env-var defaults', async () => {
      (mockConfig.get as jest.Mock).mockImplementation((key: string, fallback?: unknown) => {
        if (key === 'AI_EMERGENCY_STOP') return 'true';
        if (key === 'AI_GLOBAL_DAILY_BUDGET_USD') return 100;
        if (key === 'AI_USER_DAILY_BUDGET_USD') return 5;
        return fallback;
      });
      mockRepo.getOrCreate.mockResolvedValue(makeConfig({ emergencyStop: true, globalDailyBudgetUsd: 100, userDailyBudgetUsd: 5 }));

      const result = await service.getEffective();

      expect(mockRepo.getOrCreate).toHaveBeenCalledWith({
        emergencyStop: true, globalDailyBudgetUsd: 100, userDailyBudgetUsd: 5,
      });
      expect(result.emergencyStop).toBe(true);
    });
  });

  describe('update', () => {
    it('forbids a non-admin caller', async () => {
      await expect(service.update({ emergencyStop: true }, MEMBER)).rejects.toThrow(ForbiddenException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('ensures the singleton row is seeded before patching, then updates it for an Administrator', async () => {
      mockRepo.getOrCreate.mockResolvedValue(makeConfig());
      mockRepo.update.mockResolvedValue(makeConfig({ emergencyStop: true, updatedById: ADMIN.id }));

      const result = await service.update({ emergencyStop: true }, ADMIN);

      expect(mockRepo.getOrCreate).toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalledWith({ emergencyStop: true, updatedById: ADMIN.id });
      expect(result.emergencyStop).toBe(true);
    });
  });

  describe('getCapabilityBudgets', () => {
    it('returns every configured per-capability ceiling', async () => {
      mockCapabilityBudgetRepo.findAll.mockResolvedValue([makeCapabilityBudget()]);

      const result = await service.getCapabilityBudgets();

      expect(result).toHaveLength(1);
      expect(mockCapabilityBudgetRepo.findAll).toHaveBeenCalled();
    });
  });

  describe('getCapabilityBudget', () => {
    it('returns null when no ceiling is configured for the capability', async () => {
      mockCapabilityBudgetRepo.findByCapability.mockResolvedValue(null);

      const result = await service.getCapabilityBudget(AiCapability.VOICE_CONVERSATION);

      expect(result).toBeNull();
      expect(mockCapabilityBudgetRepo.findByCapability).toHaveBeenCalledWith(AiCapability.VOICE_CONVERSATION);
    });
  });

  describe('setCapabilityBudget', () => {
    it('forbids a non-admin caller', async () => {
      await expect(
        service.setCapabilityBudget({ capability: AiCapability.VOICE_CONVERSATION, dailyRequestLimit: 50 }, MEMBER),
      ).rejects.toThrow(ForbiddenException);
      expect(mockCapabilityBudgetRepo.upsert).not.toHaveBeenCalled();
    });

    it('upserts the ceiling for an Administrator', async () => {
      mockCapabilityBudgetRepo.upsert.mockResolvedValue(
        makeCapabilityBudget({ dailyRequestLimit: 50, updatedById: ADMIN.id }),
      );

      const result = await service.setCapabilityBudget(
        { capability: AiCapability.VOICE_CONVERSATION, dailyRequestLimit: 50 },
        ADMIN,
      );

      expect(mockCapabilityBudgetRepo.upsert).toHaveBeenCalledWith({
        capability: AiCapability.VOICE_CONVERSATION,
        dailyBudgetUsd: null,
        dailyRequestLimit: 50,
        updatedById: ADMIN.id,
      });
      expect(result.dailyRequestLimit).toBe(50);
    });
  });

  describe('removeCapabilityBudget', () => {
    it('forbids a non-admin caller', async () => {
      await expect(service.removeCapabilityBudget(AiCapability.VOICE_CONVERSATION, MEMBER)).rejects.toThrow(ForbiddenException);
      expect(mockCapabilityBudgetRepo.remove).not.toHaveBeenCalled();
    });

    it('removes the ceiling for an Administrator', async () => {
      await service.removeCapabilityBudget(AiCapability.VOICE_CONVERSATION, ADMIN);
      expect(mockCapabilityBudgetRepo.remove).toHaveBeenCalledWith(AiCapability.VOICE_CONVERSATION);
    });
  });
});
