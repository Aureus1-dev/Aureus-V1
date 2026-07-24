import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CitySheetCategory, CitySheetEntryStatus, CitySheetVerificationStatus, LaunchAreaScope, ResourceOfferResponse } from '@prisma/client';
import type { StatedNeed, ResourceOffer, UnresolvedNeed } from '@prisma/client';
import { NeedsService } from './needs.service';
import { IStatedNeedRepository, STATED_NEED_REPOSITORY } from './repositories/stated-need.repository.interface';
import { IResourceOfferRepository, RESOURCE_OFFER_REPOSITORY } from './repositories/resource-offer.repository.interface';
import {
  IUnresolvedNeedRepository,
  UNRESOLVED_NEED_REPOSITORY,
} from './repositories/unresolved-need.repository.interface';
import { CitySheetService } from '../city-sheet/city-sheet.service';
import { UsersService } from '../users/users.service';
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
  isTestFixture: false, createdById: 'steward-001', createdAt: NOW, updatedAt: NOW, ...o,
});

const makeOffer = (o: Partial<ResourceOffer> = {}): ResourceOffer => ({
  id: 'offer-001', userId: 'user-001', statedNeedId: 'need-001', citySheetEntryId: 'entry-001',
  response: ResourceOfferResponse.PENDING, offeredAt: NOW, respondedAt: null, ...o,
});

const makeUnresolvedNeed = (o: Partial<UnresolvedNeed> = {}): UnresolvedNeed => ({
  id: 'unresolved-001', userId: 'user-001', statedNeedId: 'need-001',
  reason: 'NO_VERIFIED_RESOURCE_NO_STEWARD', message: 'honest message', createdAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IStatedNeedRepository> = {
  create: jest.fn(), findAllByUser: jest.fn(), findById: jest.fn(),
};
const mockOffers: jest.Mocked<IResourceOfferRepository> = {
  create: jest.fn(), findMostRecentPending: jest.fn(), respond: jest.fn(), findAllByStatedNeed: jest.fn(),
};
const mockUnresolvedNeeds: jest.Mocked<IUnresolvedNeedRepository> = {
  create: jest.fn(), findByStatedNeed: jest.fn(),
};
const mockCitySheet = { findAll: jest.fn(), findById: jest.fn() } as unknown as jest.Mocked<CitySheetService>;
const mockUsers = { findAll: jest.fn() } as unknown as jest.Mocked<UsersService>;

describe('NeedsService', () => {
  let service: NeedsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        NeedsService,
        { provide: STATED_NEED_REPOSITORY, useValue: mockRepo },
        { provide: RESOURCE_OFFER_REPOSITORY, useValue: mockOffers },
        { provide: UNRESOLVED_NEED_REPOSITORY, useValue: mockUnresolvedNeeds },
        { provide: CitySheetService, useValue: mockCitySheet },
        { provide: UsersService, useValue: mockUsers },
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
    it('matches active, verified City Sheet resources whose category matches the need content', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ content: 'I need help finding food for my family' }));
      mockCitySheet.findAll.mockResolvedValue({
        data: [makeCitySheetEntry({ verificationStatus: CitySheetVerificationStatus.VERIFIED })],
        total: 1, page: 1, limit: 50, totalPages: 1,
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
      const entry = makeCitySheetEntry({
        id: 'entry-002', category: CitySheetCategory.LEGAL_AID, verificationStatus: CitySheetVerificationStatus.VERIFIED,
      });
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

  describe('Gate C — C9: Production verification (real members, verified data only)', () => {
    it('excludes a real (non-fixture) candidate that is not yet verified, even though its category matches', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ content: 'I need help finding food for my family' }));
      mockCitySheet.findAll.mockResolvedValue({
        data: [makeCitySheetEntry({ verificationStatus: CitySheetVerificationStatus.UNVERIFIED, isTestFixture: false })],
        total: 1, page: 1, limit: 50, totalPages: 1,
      });

      const result = await service.findMatchingResources('need-001', 'user-001');

      expect(result).toEqual([]);
    });

    it('excludes a real candidate flagged for review or rejected, even though its category matches', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ content: 'I need help finding food for my family' }));
      mockCitySheet.findAll.mockResolvedValue({
        data: [
          makeCitySheetEntry({ id: 'needs-review', verificationStatus: CitySheetVerificationStatus.NEEDS_REVIEW, isTestFixture: false }),
          makeCitySheetEntry({ id: 'rejected', verificationStatus: CitySheetVerificationStatus.REJECTED, isTestFixture: false }),
        ],
        total: 2, page: 1, limit: 50, totalPages: 1,
      });

      const result = await service.findMatchingResources('need-001', 'user-001');

      expect(result).toEqual([]);
    });

    it('still includes an explicitly labeled test fixture even though it is unverified (Gate C build/test needs this, per C4–C8)', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ content: 'I need help finding food for my family' }));
      mockCitySheet.findAll.mockResolvedValue({
        data: [makeCitySheetEntry({ verificationStatus: CitySheetVerificationStatus.UNVERIFIED, isTestFixture: true })],
        total: 1, page: 1, limit: 50, totalPages: 1,
      });

      const result = await service.findMatchingResources('need-001', 'user-001');

      expect(result).toHaveLength(1);
      expect(result[0].isTestFixture).toBe(true);
    });

    it('includes a real candidate once it is verified', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ content: 'I need help finding food for my family' }));
      mockCitySheet.findAll.mockResolvedValue({
        data: [makeCitySheetEntry({ verificationStatus: CitySheetVerificationStatus.VERIFIED, isTestFixture: false })],
        total: 1, page: 1, limit: 50, totalPages: 1,
      });

      const result = await service.findMatchingResources('need-001', 'user-001');

      expect(result).toHaveLength(1);
      expect(result[0].verificationStatus).toBe(CitySheetVerificationStatus.VERIFIED);
    });

    it('refuses to offer a real (non-fixture) unverified candidate directly by ID, even without going through discovery', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed());
      mockCitySheet.findById.mockResolvedValue(
        makeCitySheetEntry({ verificationStatus: CitySheetVerificationStatus.UNVERIFIED, isTestFixture: false }),
      );

      await expect(service.offerResource('need-001', 'entry-001', 'user-001')).rejects.toThrow(NotFoundException);
      expect(mockOffers.create).not.toHaveBeenCalled();
    });

    it('allows offering a test fixture directly by ID even though it is unverified', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed());
      mockCitySheet.findById.mockResolvedValue(
        makeCitySheetEntry({ verificationStatus: CitySheetVerificationStatus.UNVERIFIED, isTestFixture: true }),
      );
      mockOffers.create.mockResolvedValue(makeOffer());

      const result = await service.offerResource('need-001', 'entry-001', 'user-001');

      expect(mockOffers.create).toHaveBeenCalled();
      expect(result.response).toBe('PENDING');
    });
  });

  describe('Gate C — C5: Verified resource presentation', () => {
    describe('offerResource', () => {
      it('records a new offer for the caller\'s own stated need', async () => {
        mockRepo.findById.mockResolvedValue(makeNeed());
        mockCitySheet.findById.mockResolvedValue(makeCitySheetEntry({ verificationStatus: CitySheetVerificationStatus.VERIFIED }));
        mockOffers.create.mockResolvedValue(makeOffer());

        const result = await service.offerResource('need-001', 'entry-001', 'user-001');

        expect(mockOffers.create).toHaveBeenCalledWith({
          userId: 'user-001', statedNeedId: 'need-001', citySheetEntryId: 'entry-001',
        });
        expect(result.response).toBe('PENDING');
      });

      it("forbids offering a resource against another member's stated need", async () => {
        mockRepo.findById.mockResolvedValue(makeNeed({ userId: 'user-001' }));

        await expect(service.offerResource('need-001', 'entry-001', 'other-999')).rejects.toThrow(ForbiddenException);
        expect(mockOffers.create).not.toHaveBeenCalled();
      });
    });

    describe('respondToOffer', () => {
      it('records ACCEPTED against the most recent pending offer', async () => {
        mockRepo.findById.mockResolvedValue(makeNeed());
        mockOffers.findMostRecentPending.mockResolvedValue(makeOffer());
        mockOffers.respond.mockResolvedValue(makeOffer({ response: ResourceOfferResponse.ACCEPTED, respondedAt: NOW }));

        const result = await service.respondToOffer('need-001', 'entry-001', true, 'user-001');

        expect(mockOffers.respond).toHaveBeenCalledWith('offer-001', true);
        expect(result.response).toBe('ACCEPTED');
      });

      it('records DECLINED against the most recent pending offer', async () => {
        mockRepo.findById.mockResolvedValue(makeNeed());
        mockOffers.findMostRecentPending.mockResolvedValue(makeOffer());
        mockOffers.respond.mockResolvedValue(makeOffer({ response: ResourceOfferResponse.DECLINED, respondedAt: NOW }));

        const result = await service.respondToOffer('need-001', 'entry-001', false, 'user-001');

        expect(mockOffers.respond).toHaveBeenCalledWith('offer-001', false);
        expect(result.response).toBe('DECLINED');
      });

      it('throws NotFoundException when there is no pending offer to respond to', async () => {
        mockRepo.findById.mockResolvedValue(makeNeed());
        mockOffers.findMostRecentPending.mockResolvedValue(null);

        await expect(service.respondToOffer('need-001', 'entry-001', true, 'user-001')).rejects.toThrow(NotFoundException);
      });

      it("forbids responding to an offer on another member's stated need", async () => {
        mockRepo.findById.mockResolvedValue(makeNeed({ userId: 'user-001' }));

        await expect(service.respondToOffer('need-001', 'entry-001', true, 'other-999')).rejects.toThrow(ForbiddenException);
        expect(mockOffers.findMostRecentPending).not.toHaveBeenCalled();
      });
    });

    describe('findOffers', () => {
      it("retrieves every offer recorded for the caller's own stated need", async () => {
        mockRepo.findById.mockResolvedValue(makeNeed());
        mockOffers.findAllByStatedNeed.mockResolvedValue([makeOffer(), makeOffer({ id: 'offer-002', response: ResourceOfferResponse.ACCEPTED })]);

        const result = await service.findOffers('need-001', 'user-001');

        expect(result).toHaveLength(2);
      });

      it("forbids listing another member's offers", async () => {
        mockRepo.findById.mockResolvedValue(makeNeed({ userId: 'user-001' }));

        await expect(service.findOffers('need-001', 'other-999')).rejects.toThrow(ForbiddenException);
      });
    });
  });

  describe('Gate C — C7: Safe failure', () => {
    const noStewards = { data: [], total: 0, page: 1, limit: 1, totalPages: 0 };
    const oneSteward = { data: [{ id: 'steward-001' }] as never, total: 1, page: 1, limit: 1, totalPages: 1 };
    const noVerifiedResource = { data: [], total: 0, page: 1, limit: 1, totalPages: 0 };
    const oneVerifiedResource = { data: [makeCitySheetEntry()], total: 1, page: 1, limit: 1, totalPages: 1 };

    it('is not triggered, and records nothing, when a verified resource exists even without a reachable steward', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ content: 'I need help finding food for my family' }));
      mockCitySheet.findAll.mockResolvedValue(oneVerifiedResource);
      mockUsers.findAll.mockResolvedValue(noStewards);

      const result = await service.checkSafeFailure('need-001', 'user-001');

      expect(result.triggered).toBe(false);
      expect(mockUnresolvedNeeds.create).not.toHaveBeenCalled();
    });

    it('is not triggered when a steward is reachable even without a verified resource', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ content: 'I need help finding food for my family' }));
      mockCitySheet.findAll.mockResolvedValue(noVerifiedResource);
      mockUsers.findAll.mockResolvedValueOnce(oneSteward).mockResolvedValueOnce(noStewards);

      const result = await service.checkSafeFailure('need-001', 'user-001');

      expect(result.triggered).toBe(false);
      expect(mockUnresolvedNeeds.create).not.toHaveBeenCalled();
    });

    it('is not triggered when the need matches no known category at all — that is C4\'s "no keyword hit," not this', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ content: 'xyz nonsense words' }));

      const result = await service.checkSafeFailure('need-001', 'user-001');

      expect(result.triggered).toBe(false);
      expect(mockCitySheet.findAll).not.toHaveBeenCalled();
      expect(mockUnresolvedNeeds.create).not.toHaveBeenCalled();
    });

    it('honestly triggers, records the outcome once, and returns a real next step when neither a verified resource nor a steward is reachable', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ content: 'I need help finding food for my family' }));
      mockCitySheet.findAll.mockResolvedValue(noVerifiedResource);
      mockUsers.findAll.mockResolvedValue(noStewards);
      mockUnresolvedNeeds.findByStatedNeed.mockResolvedValue(null);
      mockUnresolvedNeeds.create.mockResolvedValue(makeUnresolvedNeed());

      const result = await service.checkSafeFailure('need-001', 'user-001');

      expect(mockUnresolvedNeeds.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-001', statedNeedId: 'need-001' }),
      );
      expect(result.triggered).toBe(true);
      expect(result.message).toBeTruthy();
      expect(result.nextStep).toBeTruthy();
      expect(result.recordedAt).toEqual(NOW);
    });

    it('never records a duplicate — a repeat check on an already-recorded need returns the same row', async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ content: 'I need help finding food for my family' }));
      mockCitySheet.findAll.mockResolvedValue(noVerifiedResource);
      mockUsers.findAll.mockResolvedValue(noStewards);
      mockUnresolvedNeeds.findByStatedNeed.mockResolvedValue(makeUnresolvedNeed());

      const result = await service.checkSafeFailure('need-001', 'user-001');

      expect(mockUnresolvedNeeds.create).not.toHaveBeenCalled();
      expect(result.triggered).toBe(true);
    });

    it("forbids checking safe-failure state for another member's stated need", async () => {
      mockRepo.findById.mockResolvedValue(makeNeed({ userId: 'user-001' }));

      await expect(service.checkSafeFailure('need-001', 'other-999')).rejects.toThrow(ForbiddenException);
    });
  });
});
