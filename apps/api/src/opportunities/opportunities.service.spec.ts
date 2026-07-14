import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  BenefitType, OpportunityCategory, OpportunityStatus, SourceType, VerificationStatus,
} from '@prisma/client';
import { OpportunitiesService } from './opportunities.service';
import { OPPORTUNITY_REPOSITORY, IOpportunityRepository } from './repositories/opportunity.repository.interface';
import { OpportunityScoringService } from './scoring/opportunity-scoring.service';
import { OpportunityResponseDto } from './dto/opportunity-response.dto';
import type { Opportunity } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');

const makeOpp = (o: Partial<Opportunity> = {}): Opportunity => ({
  id: 'opp-uuid', sequenceNumber: 1, opportunityRef: 'AUR-OPP-000001',
  title: 'Pell Grant', shortDescription: 'Federal grant', fullDescription: 'Full details here',
  category: OpportunityCategory.SCHOLARSHIP, tags: ['federal'],
  provider: 'DoE', officialSourceUrl: 'https://studentaid.gov',
  applicationUrl: null, location: null, country: null, state: null,
  eligibilityRules: 'Must demonstrate financial need', benefitType: BenefitType.GRANT,
  benefitAmount: null, deadline: null, status: OpportunityStatus.DRAFT,
  verificationStatus: VerificationStatus.DRAFT, rejectionReason: null,
  confidenceScore: 40, freshnessScore: 0, datePublished: null, dateLastVerified: null,
  sourceName: 'Federal Aid', sourceUrl: null, sourceType: SourceType.ADMIN_ENTRY,
  submittedById: 'u-001', createdById: 'u-001', lastUpdatedById: 'u-001',
  createdAt: NOW, updatedAt: NOW, deletedAt: null, ...o,
});

const mockRepo: jest.Mocked<IOpportunityRepository> = {
  create: jest.fn(), setRef: jest.fn(), findById: jest.fn(), findByRef: jest.fn(),
  findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
};

describe('OpportunitiesService', () => {
  let service: OpportunitiesService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        OpportunitiesService, OpportunityScoringService,
        { provide: OPPORTUNITY_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();
    service = m.get(OpportunitiesService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates opportunity, sets ref, returns DTO', async () => {
      const raw = makeOpp({ opportunityRef: null, sequenceNumber: 1 });
      mockRepo.create.mockResolvedValue(raw);
      mockRepo.setRef.mockResolvedValue({ ...raw, opportunityRef: 'AUR-OPP-000001' });

      const result = await service.create({
        title: 'Pell Grant', shortDescription: 'S', fullDescription: 'F',
        category: OpportunityCategory.SCHOLARSHIP, provider: 'DoE',
        officialSourceUrl: 'https://studentaid.gov', eligibilityRules: 'E',
        benefitType: BenefitType.GRANT, sourceName: 'Federal Aid',
        submittedById: 'u-001', createdById: 'u-001',
      });

      expect(mockRepo.setRef).toHaveBeenCalledWith('opp-uuid', 'AUR-OPP-000001');
      expect(result).toBeInstanceOf(OpportunityResponseDto);
      expect(result.opportunityRef).toBe('AUR-OPP-000001');
    });

    it('pads sequence number to 6 digits', async () => {
      mockRepo.create.mockResolvedValue(makeOpp({ sequenceNumber: 42 }));
      mockRepo.setRef.mockResolvedValue(makeOpp({ sequenceNumber: 42, opportunityRef: 'AUR-OPP-000042' }));
      await service.create({
        title: 'T', shortDescription: 'S', fullDescription: 'F',
        category: OpportunityCategory.GRANT, provider: 'P',
        officialSourceUrl: 'https://x.com', eligibilityRules: 'E',
        benefitType: BenefitType.GRANT, sourceName: 'S',
        submittedById: 'u-001', createdById: 'u-001',
      });
      expect(mockRepo.setRef).toHaveBeenCalledWith(expect.any(String), 'AUR-OPP-000042');
    });
  });

  describe('findAll', () => {
    it('defaults verificationStatus to VERIFIED', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });
      await service.findAll({});
      expect(mockRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ verificationStatus: VerificationStatus.VERIFIED }),
      );
    });

    it('returns paginated response with totalPages', async () => {
      mockRepo.findAll.mockResolvedValue({ data: [makeOpp()], total: 1, page: 1, limit: 20 });
      const r = await service.findAll({});
      expect(r.totalPages).toBe(1);
      expect(r.data[0]).toBeInstanceOf(OpportunityResponseDto);
    });
  });

  describe('findById / findByRef', () => {
    it('throws NotFoundException for unknown id', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for unknown ref', async () => {
      mockRepo.findByRef.mockResolvedValue(null);
      await expect(service.findByRef('AUR-OPP-999999')).rejects.toThrow(NotFoundException);
    });

    it('returns DTO when found by id', async () => {
      mockRepo.findById.mockResolvedValue(makeOpp());
      expect(await service.findById('opp-uuid')).toBeInstanceOf(OpportunityResponseDto);
    });
  });

  describe('verification workflow', () => {
    it('submitForReview: DRAFT → PENDING_REVIEW', async () => {
      mockRepo.findById.mockResolvedValue(makeOpp());
      mockRepo.update.mockResolvedValue(makeOpp({ verificationStatus: VerificationStatus.PENDING_REVIEW }));
      const r = await service.submitForReview('opp-uuid', 'u-001');
      expect(r.verificationStatus).toBe(VerificationStatus.PENDING_REVIEW);
    });

    it('submitForReview: throws ConflictException if not DRAFT', async () => {
      mockRepo.findById.mockResolvedValue(makeOpp({ verificationStatus: VerificationStatus.PENDING_REVIEW }));
      await expect(service.submitForReview('opp-uuid', 'u-001')).rejects.toThrow(ConflictException);
    });

    it('verify: PENDING_REVIEW → VERIFIED with updated scores', async () => {
      mockRepo.findById.mockResolvedValue(makeOpp({ verificationStatus: VerificationStatus.PENDING_REVIEW }));
      mockRepo.update.mockResolvedValue(makeOpp({ verificationStatus: VerificationStatus.VERIFIED, status: OpportunityStatus.ACTIVE }));
      const r = await service.verify('opp-uuid', { reviewedById: 'admin-001' });
      expect(r.verificationStatus).toBe(VerificationStatus.VERIFIED);
      expect(mockRepo.update).toHaveBeenCalledWith(
        'opp-uuid',
        expect.objectContaining({ verificationStatus: VerificationStatus.VERIFIED, dateLastVerified: expect.any(Date) }),
      );
    });

    it('verify: throws ConflictException if not PENDING_REVIEW', async () => {
      mockRepo.findById.mockResolvedValue(makeOpp({ verificationStatus: VerificationStatus.DRAFT }));
      await expect(service.verify('opp-uuid', { reviewedById: 'admin-001' })).rejects.toThrow(ConflictException);
    });

    it('reject: PENDING_REVIEW → REJECTED with reason', async () => {
      mockRepo.findById.mockResolvedValue(makeOpp({ verificationStatus: VerificationStatus.PENDING_REVIEW }));
      mockRepo.update.mockResolvedValue(makeOpp({ verificationStatus: VerificationStatus.REJECTED, rejectionReason: 'Bad source' }));
      const r = await service.reject('opp-uuid', { rejectionReason: 'Bad source', reviewedById: 'admin-001' });
      expect(r.verificationStatus).toBe(VerificationStatus.REJECTED);
    });

    it('archive: any status → ARCHIVED', async () => {
      mockRepo.findById.mockResolvedValue(makeOpp({ verificationStatus: VerificationStatus.VERIFIED }));
      mockRepo.update.mockResolvedValue(makeOpp({ verificationStatus: VerificationStatus.ARCHIVED }));
      const r = await service.archive('opp-uuid', 'admin-001');
      expect(r.verificationStatus).toBe(VerificationStatus.ARCHIVED);
    });
  });

  describe('remove', () => {
    it('soft-deletes when found', async () => {
      mockRepo.findById.mockResolvedValue(makeOpp());
      mockRepo.softDelete.mockResolvedValue(makeOpp({ deletedAt: NOW }));
      await expect(service.remove('opp-uuid')).resolves.toBeUndefined();
    });

    it('throws NotFoundException', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });
  });
});
