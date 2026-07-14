import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MilestoneStatus } from '@prisma/client';
import { MilestonesService } from './milestones.service';
import { IMilestoneRepository, MILESTONE_REPOSITORY } from './repositories/milestone.repository.interface';
import { MilestoneResponseDto } from './dto/milestone-response.dto';
import type { Milestone } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const makeMs = (o: Partial<Milestone> = {}): Milestone => ({
  id: 'm-001', title: 'Test MS', status: MilestoneStatus.PENDING, position: 0,
  journeyId: 'j-001', createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRepo: jest.Mocked<IMilestoneRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(),
  update: jest.fn(), softDelete: jest.fn(),
};

describe('MilestonesService', () => {
  let service: MilestonesService;
  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [MilestonesService, { provide: MILESTONE_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(MilestonesService);
    jest.clearAllMocks();
  });

  it('creates a milestone', async () => {
    mockRepo.create.mockResolvedValue(makeMs());
    expect(await service.create({ title: 'M', journeyId: 'j-001' })).toBeInstanceOf(MilestoneResponseDto);
  });

  it('findAll returns paginated milestones', async () => {
    mockRepo.findAll.mockResolvedValue({ data: [makeMs()], total: 1, page: 1, limit: 20 });
    const r = await service.findAll({});
    expect(r.totalPages).toBe(1);
  });

  it('findAll forwards journeyId filter', async () => {
    mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
    await service.findAll({ journeyId: 'j-001' });
    expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({ journeyId: 'j-001' }));
  });

  it('findById throws NotFoundException', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.findById('x')).rejects.toThrow(NotFoundException);
  });

  it('update throws NotFoundException when not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.update('x', {})).rejects.toThrow(NotFoundException);
  });

  it('remove soft-deletes', async () => {
    mockRepo.findById.mockResolvedValue(makeMs());
    mockRepo.softDelete.mockResolvedValue(makeMs({ deletedAt: NOW }));
    await expect(service.remove('m-001')).resolves.toBeUndefined();
  });

  it('remove throws NotFoundException', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.remove('x')).rejects.toThrow(NotFoundException);
  });
});
