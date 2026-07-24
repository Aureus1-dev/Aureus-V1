import { Test } from '@nestjs/testing';
import type { StatedNeed } from '@prisma/client';
import { NeedsService } from './needs.service';
import { IStatedNeedRepository, STATED_NEED_REPOSITORY } from './repositories/stated-need.repository.interface';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const makeNeed = (o: Partial<StatedNeed> = {}): StatedNeed => ({
  id: 'need-001', userId: 'user-001', conversationId: 'conv-001', content: 'I need help finding a job', createdAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IStatedNeedRepository> = {
  create: jest.fn(), findAllByUser: jest.fn(),
};

describe('NeedsService', () => {
  let service: NeedsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [NeedsService, { provide: STATED_NEED_REPOSITORY, useValue: mockRepo }],
    }).compile();
    service = m.get(NeedsService);
    jest.clearAllMocks();
  });

  describe('capture', () => {
    it('creates a stated need for the given user, conversation, and content', async () => {
      mockRepo.create.mockResolvedValue(makeNeed());

      const result = await service.capture('user-001', 'conv-001', 'I need help finding a job');

      expect(mockRepo.create).toHaveBeenCalledWith({
        userId: 'user-001', conversationId: 'conv-001', content: 'I need help finding a job',
      });
      expect(result.content).toBe('I need help finding a job');
      expect(result.conversationId).toBe('conv-001');
    });
  });

  describe('findMine', () => {
    it("returns the caller's own stated needs, most recent first (per repository ordering)", async () => {
      mockRepo.findAllByUser.mockResolvedValue([makeNeed({ id: 'need-002' }), makeNeed({ id: 'need-001' })]);

      const result = await service.findMine('user-001');

      expect(mockRepo.findAllByUser).toHaveBeenCalledWith('user-001');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('need-002');
    });
  });
});
