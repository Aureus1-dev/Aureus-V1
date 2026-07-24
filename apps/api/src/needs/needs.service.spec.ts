import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CitySheetCategory, CitySheetEntryStatus, CitySheetVerificationStatus, LaunchAreaScope } from '@prisma/client';
import type { StatedNeed } from '@prisma/client';
import { NeedsService } from './needs.service';
import { IStatedNeedRepository, STATED_NEED_REPOSITORY } from './repositories/stated-need.repository.interface';
import { CitySheetService } from '../city-sheet/city-sheet.service';
import type { CitySheetEntryResponseDto } from '../city-sheet/dto/city-sheet-entry-response.dto';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const makeNeed = (o: Partial<StatedNeed> = {}): StatedNeed => ({
  id: 'need-001', userId: 'user-001', conversationId: 'conv-001', content: 'I need help finding a job', createdAt: NOW, ...o,
});

const makeCitySheetEntry = (o: Partial<CitySheetEntryResponseDto> = {}): CitySheetEntryResponseDto => ({
  id: 'entry-001', citySheetRef: 'AUR-CS-000001', organizationName: 'Chester County Food Bank',
  category: CitySheetCategory.FOOD_RESOURCE, description: 'Provides groceries to families in need.',
  address: null, serviceArea: 'Chester County', launchScope: LaunchAreaScope.CORE_LAUNCH_COUNTY,
  phone: null, website: null, hours: 'Mon-Fri 9am-5pm', eligibilityRequirements: null,
  languagesSupported: [], accessibilityNotes: null, cost: null, requiredDocuments: [],
  referralRequired: false, isEmergencyService: false,
  verificationStatus: CitySheetVerificationStatus.UNVERIFIED, verificationConfidence: null,
  lastVerifiedAt: null, verifiedById: null, verificationNotes: null, rejectionReason: null,
  nextReviewDueAt: null, sourceNotes: null, status: CitySheetEntryStatus.ACTIVE,
  createdById: 'steward-001', createdAt: NOW, updatedAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IStatedNeedRepository> = {
  create: jest.fn(), findAllByUser: jest.fn(), findById: jest.fn(),
};
const mockCitySheet = { findAll: jest.fn() } as unknown as jest.Mocked<CitySheetService>;

describe('NeedsService', () => {
  let service: NeedsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        NeedsService,
        { provide: STATED_NEED_REPOSITORY, useValue: mockRepo },
        { provide: CitySheetService, useValue: mockCitySheet },
      ],
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

  describe('Gate C — C4: Resource discovery', () => {
    it('matches active City Sheet resources whose category matches the need content', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ content: 'I need help finding food for my family' }));
      mockCitySheet.findAll.mockResolvedValue({
        data: [makeCitySheetEntry()], total: 1, page: 1, limit: 50, totalPages: 1,
      });

      const result = await service.findMatchingResources('need-001', 'user-001');

      expect(mockCitySheet.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ category: CitySheetCategory.FOOD_RESOURCE, status: CitySheetEntryStatus.ACTIVE }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].organizationName).toBe('Chester County Food Bank');
    });

    it('returns no resources when the need matches no known category, without querying the City Sheet', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ content: 'xyz nonsense words' }));

      const result = await service.findMatchingResources('need-001', 'user-001');

      expect(result).toEqual([]);
      expect(mockCitySheet.findAll).not.toHaveBeenCalled();
    });

    it('deduplicates a resource matched by more than one category', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ content: 'I got an eviction notice and need legal help with housing' }));
      const entry = makeCitySheetEntry({ id: 'entry-002', category: CitySheetCategory.LEGAL_AID });
      mockCitySheet.findAll.mockResolvedValue({ data: [entry], total: 1, page: 1, limit: 50, totalPages: 1 });

      const result = await service.findMatchingResources('need-001', 'user-001');

      expect(mockCitySheet.findAll).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
    });

    it("forbids a caller from viewing another member's stated-need resources", async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ userId: 'user-001' }));

      await expect(service.findMatchingResources('need-001', 'other-999')).rejects.toThrow(ForbiddenException);
      expect(mockCitySheet.findAll).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a missing stated need', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.findMatchingResources('ghost', 'user-001')).rejects.toThrow(NotFoundException);
    });
  });
});
