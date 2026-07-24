import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CitySheetCategory } from '@prisma/client';
import type { CitySheetChecklistItem } from '@prisma/client';
import { ChecklistItemsService } from './checklist-items.service';
import { CHECKLIST_ITEM_REPOSITORY, IChecklistItemRepository } from './repositories/checklist-item.repository.interface';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const makeItem = (o: Partial<CitySheetChecklistItem> = {}): CitySheetChecklistItem => ({
  id: 'item-uuid', category: null, label: 'Phone number reached and currently in service',
  sortOrder: 20, isActive: true, createdAt: NOW, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IChecklistItemRepository> = {
  create: jest.fn(), findById: jest.fn(), findByLabel: jest.fn(), findApplicable: jest.fn(),
  findAll: jest.fn(), update: jest.fn(),
};

describe('ChecklistItemsService', () => {
  let service: ChecklistItemsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        ChecklistItemsService,
        { provide: CHECKLIST_ITEM_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();
    service = m.get(ChecklistItemsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a common item when no category is given', async () => {
      mockRepo.findByLabel.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeItem());

      const result = await service.create({ label: 'Phone number reached and currently in service' });

      expect(mockRepo.findByLabel).toHaveBeenCalledWith(null, 'Phone number reached and currently in service');
      expect(result.category).toBeNull();
    });

    it('creates a category-scoped item', async () => {
      mockRepo.findByLabel.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeItem({ category: CitySheetCategory.CRISIS_LINE }));

      const result = await service.create({ category: CitySheetCategory.CRISIS_LINE, label: 'Confirm 24/7 availability' });
      expect(result.category).toBe(CitySheetCategory.CRISIS_LINE);
    });

    it('throws ConflictException on a duplicate (category, label) pair', async () => {
      mockRepo.findByLabel.mockResolvedValue(makeItem());
      await expect(service.create({ label: 'Phone number reached and currently in service' }))
        .rejects.toThrow(ConflictException);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('defaults to active items only', async () => {
      mockRepo.findAll.mockResolvedValue([makeItem()]);
      await service.findAll();
      expect(mockRepo.findAll).toHaveBeenCalledWith({ category: undefined, includeInactive: undefined });
    });
  });

  describe('findApplicableForCategory', () => {
    it('delegates to repo.findApplicable (common + category items)', async () => {
      mockRepo.findApplicable.mockResolvedValue([
        makeItem({ id: 'common-1', category: null }),
        makeItem({ id: 'crisis-1', category: CitySheetCategory.CRISIS_LINE, label: 'Confirm 24/7' }),
      ]);

      const result = await service.findApplicableForCategory(CitySheetCategory.CRISIS_LINE);
      expect(mockRepo.findApplicable).toHaveBeenCalledWith(CitySheetCategory.CRISIS_LINE);
      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('updates an item', async () => {
      mockRepo.findById.mockResolvedValue(makeItem());
      mockRepo.update.mockResolvedValue(makeItem({ label: 'Updated label' }));

      const result = await service.update('item-uuid', { label: 'Updated label' });
      expect(result.label).toBe('Updated label');
    });

    it('retires an item via isActive without deleting it', async () => {
      mockRepo.findById.mockResolvedValue(makeItem());
      mockRepo.update.mockResolvedValue(makeItem({ isActive: false }));

      const result = await service.update('item-uuid', { isActive: false });
      expect(result.isActive).toBe(false);
      expect(mockRepo.update).toHaveBeenCalledWith('item-uuid', { isActive: false });
    });

    it('throws NotFoundException for a missing item', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.update('missing', { label: 'x' })).rejects.toThrow(NotFoundException);
    });
  });
});
