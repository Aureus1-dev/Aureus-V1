import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TrackingStatus } from '@prisma/client';
import { SavedOpportunitiesService } from './saved-opportunities.service';
import {
  ISavedOpportunityRepository,
  SAVED_OPPORTUNITY_REPOSITORY,
} from './repositories/saved-opportunity.repository.interface';
import { SavedOpportunityResponseDto } from './dto/saved-opportunity-response.dto';
import type { SavedOpportunity } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeSaved = (o: Partial<SavedOpportunity> = {}): SavedOpportunity => ({
  id: 's-001', userId: 'u-001', opportunityId: 'opp-001',
  isFavorite: false, trackingStatus: TrackingStatus.SAVED, notes: null,
  savedAt: NOW, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<ISavedOpportunityRepository> = {
  save: jest.fn(), findByUser: jest.fn(), findOne: jest.fn(),
  update: jest.fn(), remove: jest.fn(),
};

describe('SavedOpportunitiesService', () => {
  let service: SavedOpportunitiesService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [SavedOpportunitiesService, { provide: SAVED_OPPORTUNITY_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(SavedOpportunitiesService);
    jest.clearAllMocks();
  });

  it('saves an opportunity and returns DTO', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    mockRepo.save.mockResolvedValue(makeSaved());
    const r = await service.save('u-001', { opportunityId: 'opp-001' });
    expect(r).toBeInstanceOf(SavedOpportunityResponseDto);
  });

  it('throws ConflictException if already saved', async () => {
    mockRepo.findOne.mockResolvedValue(makeSaved());
    await expect(service.save('u-001', { opportunityId: 'opp-001' })).rejects.toThrow(ConflictException);
  });

  it('findByUser returns list of DTOs', async () => {
    mockRepo.findByUser.mockResolvedValue([makeSaved()]);
    const r = await service.findByUser('u-001');
    expect(r).toHaveLength(1);
    expect(r[0]).toBeInstanceOf(SavedOpportunityResponseDto);
  });

  it('update changes tracking status', async () => {
    mockRepo.findOne.mockResolvedValue(makeSaved());
    mockRepo.update.mockResolvedValue(makeSaved({ trackingStatus: TrackingStatus.APPLYING }));
    const r = await service.update('u-001', 'opp-001', { trackingStatus: TrackingStatus.APPLYING });
    expect(r.trackingStatus).toBe(TrackingStatus.APPLYING);
  });

  it('update throws NotFoundException if not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.update('u-001', 'x', {})).rejects.toThrow(NotFoundException);
  });

  it('remove deletes saved opportunity', async () => {
    mockRepo.findOne.mockResolvedValue(makeSaved());
    mockRepo.remove.mockResolvedValue(undefined);
    await expect(service.remove('u-001', 'opp-001')).resolves.toBeUndefined();
  });

  it('remove throws NotFoundException if not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    await expect(service.remove('u-001', 'x')).rejects.toThrow(NotFoundException);
  });
});
