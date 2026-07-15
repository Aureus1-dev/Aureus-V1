import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  StewardshipRecommendationType, StewardshipRelationshipOrigin, StewardshipRelationshipStatus, UserRole,
} from '@prisma/client';
import { StewardshipRecommendationsService } from './stewardship-recommendations.service';
import {
  STEWARDSHIP_RECOMMENDATION_REPOSITORY,
  IStewardshipRecommendationRepository,
} from './repositories/stewardship-recommendation.repository.interface';
import {
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
  IStewardshipRelationshipRepository,
} from '../relationships/repositories/stewardship-relationship.repository.interface';
import { OpportunitiesService } from '../../opportunities/opportunities.service';
import { ResourcesService } from '../../resources/resources.service';
import type { StewardshipRecommendation, StewardshipRelationship } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const MEMBER: AuthenticatedUser = { id: 'member-001', email: 'm@example.com', roles: [UserRole.MEMBER] };
const OTHER: AuthenticatedUser = { id: 'other-001', email: 'o@example.com', roles: [UserRole.MEMBER] };
const STEWARD: AuthenticatedUser = { id: 'steward-001', email: 's@example.com', roles: [UserRole.STEWARD] };
const ADMIN: AuthenticatedUser = { id: 'admin-001', email: 'a@example.com', roles: [UserRole.PLATFORM_ADMINISTRATOR] };

const makeRelationship = (o: Partial<StewardshipRelationship> = {}): StewardshipRelationship => ({
  id: 'rel-001', memberId: MEMBER.id, stewardId: STEWARD.id,
  status: StewardshipRelationshipStatus.ACTIVE, origin: StewardshipRelationshipOrigin.ADMIN_ASSIGNMENT,
  requestedById: null, assignedById: ADMIN.id, assignedByOrganizationId: null, recommendedById: null,
  endReason: null, endedById: null, endedAt: null, activatedAt: NOW, createdAt: NOW, updatedAt: NOW, ...o,
});

const makeRecommendation = (o: Partial<StewardshipRecommendation> = {}): StewardshipRecommendation => ({
  id: 'rec-001', relationshipId: 'rel-001', type: StewardshipRecommendationType.OPPORTUNITY,
  opportunityId: 'opp-001', resourceId: null, note: null, createdById: STEWARD.id, createdAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IStewardshipRecommendationRepository> = {
  create: jest.fn(), findByRelationship: jest.fn(),
};
const mockRelationshipRepo: jest.Mocked<IStewardshipRelationshipRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), countActiveByStewardId: jest.fn(), update: jest.fn(),
};
const mockOpportunitiesService = { findById: jest.fn() } as unknown as OpportunitiesService;
const mockResourcesService = { findById: jest.fn() } as unknown as ResourcesService;

describe('StewardshipRecommendationsService', () => {
  let service: StewardshipRecommendationsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        StewardshipRecommendationsService,
        { provide: STEWARDSHIP_RECOMMENDATION_REPOSITORY, useValue: mockRepo },
        { provide: STEWARDSHIP_RELATIONSHIP_REPOSITORY, useValue: mockRelationshipRepo },
        { provide: OpportunitiesService, useValue: mockOpportunitiesService },
        { provide: ResourcesService, useValue: mockResourcesService },
      ],
    }).compile();
    service = m.get(StewardshipRecommendationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('allows the steward to recommend a valid Opportunity', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      (mockOpportunitiesService.findById as jest.Mock).mockResolvedValue({ id: 'opp-001' });
      mockRepo.create.mockResolvedValue(makeRecommendation());

      const result = await service.create('rel-001', { type: StewardshipRecommendationType.OPPORTUNITY, opportunityId: 'opp-001' }, STEWARD);
      expect(result.opportunityId).toBe('opp-001');
    });

    it('allows the steward to recommend a valid Resource', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      (mockResourcesService.findById as jest.Mock).mockResolvedValue({ id: 'res-001' });
      mockRepo.create.mockResolvedValue(makeRecommendation({
        type: StewardshipRecommendationType.RESOURCE, opportunityId: null, resourceId: 'res-001',
      }));

      const result = await service.create('rel-001', { type: StewardshipRecommendationType.RESOURCE, resourceId: 'res-001' }, STEWARD);
      expect(result.resourceId).toBe('res-001');
    });

    it('throws BadRequestException when opportunityId is missing for type OPPORTUNITY', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      await expect(service.create('rel-001', { type: StewardshipRecommendationType.OPPORTUNITY }, STEWARD))
        .rejects.toThrow(BadRequestException);
    });

    it('propagates NotFoundException when the opportunity does not exist', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      (mockOpportunitiesService.findById as jest.Mock).mockRejectedValue(new NotFoundException());
      await expect(service.create('rel-001', { type: StewardshipRecommendationType.OPPORTUNITY, opportunityId: 'ghost' }, STEWARD))
        .rejects.toThrow(NotFoundException);
    });

    it('forbids a non-steward from recommending', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      await expect(service.create('rel-001', { type: StewardshipRecommendationType.OPPORTUNITY, opportunityId: 'opp-001' }, MEMBER))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByRelationship', () => {
    it('is visible to the member', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      mockRepo.findByRelationship.mockResolvedValue([makeRecommendation()]);
      const result = await service.findByRelationship('rel-001', MEMBER);
      expect(result).toHaveLength(1);
    });

    it('forbids an unrelated caller', async () => {
      mockRelationshipRepo.findById.mockResolvedValue(makeRelationship());
      await expect(service.findByRelationship('rel-001', OTHER)).rejects.toThrow(ForbiddenException);
    });
  });
});
