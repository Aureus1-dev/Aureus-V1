import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { JourneyStatus } from '@prisma/client';
import { JourneysService } from './journeys.service';
import { JOURNEY_REPOSITORY, IJourneyRepository } from './repositories/journey.repository.interface';
import { JourneyResponseDto } from './dto/journey-response.dto';
import type { Journey } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeJourney = (o: Partial<Journey> = {}): Journey => ({
  id: 'j-001', title: 'Test Journey', status: JourneyStatus.ACTIVE,
  goalId: 'g-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRepo: jest.Mocked<IJourneyRepository> = {
  create: jest.fn(), findById: jest.fn(), findByGoalId: jest.fn(),
  update: jest.fn(), softDelete: jest.fn(),
};

describe('JourneysService', () => {
  let service: JourneysService;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [JourneysService, { provide: JOURNEY_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(JourneysService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates journey when goal has none', async () => {
      mockRepo.findByGoalId.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeJourney());
      expect(await service.create({ title: 'J', goalId: 'g-001' })).toBeInstanceOf(JourneyResponseDto);
    });
    it('throws ConflictException when goal already has a journey', async () => {
      mockRepo.findByGoalId.mockResolvedValue(makeJourney());
      await expect(service.create({ title: 'J', goalId: 'g-001' })).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('returns journey when found', async () => {
      mockRepo.findById.mockResolvedValue(makeJourney());
      expect(await service.findById('j-001')).toBeInstanceOf(JourneyResponseDto);
    });
    it('throws NotFoundException', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByGoalId', () => {
    it('returns journey for goal', async () => {
      mockRepo.findByGoalId.mockResolvedValue(makeJourney());
      expect(await service.findByGoalId('g-001')).toBeInstanceOf(JourneyResponseDto);
    });
    it('throws NotFoundException when no journey for goal', async () => {
      mockRepo.findByGoalId.mockResolvedValue(null);
      await expect(service.findByGoalId('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates journey', async () => {
      mockRepo.findById.mockResolvedValue(makeJourney());
      mockRepo.update.mockResolvedValue(makeJourney({ title: 'Updated' }));
      expect((await service.update('j-001', { title: 'Updated' })).title).toBe('Updated');
    });
    it('throws NotFoundException', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('x', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes journey', async () => {
      mockRepo.findById.mockResolvedValue(makeJourney());
      mockRepo.softDelete.mockResolvedValue(makeJourney({ deletedAt: NOW }));
      await expect(service.remove('j-001')).resolves.toBeUndefined();
    });
    it('throws NotFoundException', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });
  });
});
