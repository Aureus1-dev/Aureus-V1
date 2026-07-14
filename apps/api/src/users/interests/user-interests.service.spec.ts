import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OpportunityCategory } from '@prisma/client';
import { UserInterestsService } from './user-interests.service';
import { IUserInterestRepository, USER_INTEREST_REPOSITORY } from './repositories/user-interest.repository.interface';
import { InterestResponseDto } from './dto/interest-dto';
import type { UserInterest } from '@prisma/client';

const NOW = new Date();
const makeInterest = (cat = OpportunityCategory.SCHOLARSHIP): UserInterest => ({
  id: 'i-001', userId: 'u-001', category: cat, createdAt: NOW,
});

const mockRepo: jest.Mocked<IUserInterestRepository> = {
  add: jest.fn(), findByUser: jest.fn(), exists: jest.fn(), remove: jest.fn(),
};

describe('UserInterestsService', () => {
  let service: UserInterestsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [UserInterestsService, { provide: USER_INTEREST_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(UserInterestsService);
    jest.clearAllMocks();
  });

  it('adds a new interest', async () => {
    mockRepo.exists.mockResolvedValue(false);
    mockRepo.add.mockResolvedValue(makeInterest());
    expect(await service.add('u-001', { category: OpportunityCategory.SCHOLARSHIP }))
      .toBeInstanceOf(InterestResponseDto);
  });

  it('throws ConflictException for duplicate interest', async () => {
    mockRepo.exists.mockResolvedValue(true);
    await expect(service.add('u-001', { category: OpportunityCategory.SCHOLARSHIP }))
      .rejects.toThrow(ConflictException);
  });

  it('findByUser returns list of DTOs', async () => {
    mockRepo.findByUser.mockResolvedValue([makeInterest()]);
    const r = await service.findByUser('u-001');
    expect(r).toHaveLength(1);
    expect(r[0]).toBeInstanceOf(InterestResponseDto);
  });

  it('remove deletes interest', async () => {
    mockRepo.exists.mockResolvedValue(true);
    mockRepo.remove.mockResolvedValue(undefined);
    await expect(service.remove('u-001', OpportunityCategory.SCHOLARSHIP)).resolves.toBeUndefined();
  });

  it('remove throws NotFoundException for non-existent interest', async () => {
    mockRepo.exists.mockResolvedValue(false);
    await expect(service.remove('u-001', OpportunityCategory.SCHOLARSHIP)).rejects.toThrow(NotFoundException);
  });
});
