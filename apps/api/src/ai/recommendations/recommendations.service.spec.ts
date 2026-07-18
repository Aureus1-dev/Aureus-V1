import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AiCapability, AiRecommendationStatus, NotificationCategory, StewardshipRelationshipStatus, UserRole } from '@prisma/client';
import { RecommendationsService } from './recommendations.service';
import { RecommendationCategory } from './dto/request-recommendations.dto';
import {
  AI_RECOMMENDATION_REPOSITORY,
  IAiRecommendationRepository,
} from './repositories/ai-recommendation.repository.interface';
import { OpportunitiesService } from '../../opportunities/opportunities.service';
import { ResourcesService } from '../../resources/resources.service';
import { GoalsService } from '../../goals/goals.service';
import { CoursesService } from '../../academy/courses/courses.service';
import { PodMatchingService } from '../../pods/matching/pod-matching.service';
import { AiRequestsService } from '../requests/ai-requests.service';
import { NotificationsService } from '../../communication/notifications/notifications.service';
import { StewardshipRelationshipsService } from '../../stewardship/relationships/stewardship-relationships.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { AiRecommendation } from '@prisma/client';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const USER: AuthenticatedUser = { id: 'user-001', email: 'user@example.com', roles: [UserRole.MEMBER] };
const OTHER_USER: AuthenticatedUser = { id: 'other-001', email: 'other@example.com', roles: [UserRole.MEMBER] };

const makeRecommendation = (o: Partial<AiRecommendation> = {}): AiRecommendation => ({
  id: 'rec-001', userId: USER.id, opportunityId: 'opp-001', resourceId: null, courseId: null,
  rationale: 'A great fit for your goals.', status: AiRecommendationStatus.PENDING, decidedAt: null,
  aiRequestId: 'req-001', createdAt: NOW, ...o,
});

const mockRepo: jest.Mocked<IAiRecommendationRepository> = {
  create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), findExistingPending: jest.fn(), update: jest.fn(),
};
const mockOpportunitiesService = { findAll: jest.fn() } as unknown as jest.Mocked<OpportunitiesService>;
const mockResourcesService = { findAll: jest.fn() } as unknown as jest.Mocked<ResourcesService>;
const mockGoalsService = { findAll: jest.fn() } as unknown as jest.Mocked<GoalsService>;
const mockCoursesService = { findAll: jest.fn() } as unknown as jest.Mocked<CoursesService>;
const mockPodMatching = { rankCandidates: jest.fn() } as unknown as jest.Mocked<PodMatchingService>;
const mockAiRequests = { runCompletion: jest.fn() } as unknown as jest.Mocked<AiRequestsService>;
const mockNotificationsService = { notify: jest.fn() } as unknown as NotificationsService;
const mockStewardshipRelationshipsService = { findAll: jest.fn() } as unknown as jest.Mocked<StewardshipRelationshipsService>;

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: AI_RECOMMENDATION_REPOSITORY, useValue: mockRepo },
        { provide: OpportunitiesService, useValue: mockOpportunitiesService },
        { provide: ResourcesService, useValue: mockResourcesService },
        { provide: GoalsService, useValue: mockGoalsService },
        { provide: CoursesService, useValue: mockCoursesService },
        { provide: PodMatchingService, useValue: mockPodMatching },
        { provide: AiRequestsService, useValue: mockAiRequests },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: StewardshipRelationshipsService, useValue: mockStewardshipRelationshipsService },
      ],
    }).compile();
    service = m.get(RecommendationsService);
    jest.clearAllMocks();

    mockGoalsService.findAll.mockResolvedValue({ data: [{ title: 'Save $1000' }], total: 1, page: 1, limit: 20 } as never);
    mockOpportunitiesService.findAll.mockResolvedValue({
      data: [{ id: 'opp-001', title: 'Scholarship', shortDescription: 'x' }, { id: 'opp-002', title: 'Grant', shortDescription: 'y' }],
      total: 2, page: 1, limit: 10,
    } as never);
  });

  describe('generate', () => {
    it('parses valid JSON picks from the AI and persists recommendations with real FKs', async () => {
      mockAiRequests.runCompletion.mockResolvedValue({
        content: JSON.stringify([{ id: 'opp-001', rationale: 'Matches your savings goal.' }]),
        requestId: 'req-001',
      });
      mockRepo.findExistingPending.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeRecommendation());

      const result = await service.generate({ category: RecommendationCategory.OPPORTUNITY }, USER);

      expect(mockAiRequests.runCompletion).toHaveBeenCalledWith(expect.objectContaining({ capability: AiCapability.RECOMMENDATION }));
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: USER.id, opportunityId: 'opp-001', rationale: 'Matches your savings goal.', aiRequestId: 'req-001',
      }));
      expect(result).toHaveLength(1);
      expect(mockNotificationsService.notify).toHaveBeenCalledWith(expect.objectContaining({
        recipientId: USER.id, category: NotificationCategory.AI_GUIDANCE,
      }));
    });

    it('falls back to the top candidates with a generic rationale when the AI response is not valid JSON', async () => {
      mockAiRequests.runCompletion.mockResolvedValue({ content: 'not json at all', requestId: 'req-001' });
      mockRepo.findExistingPending.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeRecommendation());

      const result = await service.generate({ category: RecommendationCategory.OPPORTUNITY }, USER);

      expect(result.length).toBeGreaterThan(0);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ opportunityId: 'opp-001' }));
    });

    it('reuses an existing PENDING recommendation instead of creating a duplicate', async () => {
      mockAiRequests.runCompletion.mockResolvedValue({
        content: JSON.stringify([{ id: 'opp-001', rationale: 'x' }]),
        requestId: 'req-001',
      });
      mockRepo.findExistingPending.mockResolvedValue(makeRecommendation());

      await service.generate({ category: RecommendationCategory.OPPORTUNITY }, USER);

      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('POD category sources candidates from the deterministic PodMatchingService, never decides Pod membership itself', async () => {
      mockPodMatching.rankCandidates.mockResolvedValue([
        { pod: { id: 'pod-001', name: 'Riverside Home Pod', shortDescription: 'A local community' }, score: 9 } as never,
      ]);
      mockAiRequests.runCompletion.mockResolvedValue({
        content: JSON.stringify([{ id: 'pod-001', rationale: 'Close to your area and a great fit.' }]),
        requestId: 'req-003',
      });
      mockRepo.findExistingPending.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(makeRecommendation({ opportunityId: null, podId: 'pod-001' } as never));

      const result = await service.generate({ category: RecommendationCategory.POD }, USER);

      expect(mockPodMatching.rankCandidates).toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ podId: 'pod-001' }));
      expect(result).toHaveLength(1);
    });

    it('returns an empty array without calling the AI when there are no candidates', async () => {
      mockOpportunitiesService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 } as never);
      const result = await service.generate({ category: RecommendationCategory.OPPORTUNITY }, USER);
      expect(result).toEqual([]);
      expect(mockAiRequests.runCompletion).not.toHaveBeenCalled();
    });

    describe('STEWARD_ESCALATION category', () => {
      it('sources its one candidate from the caller\'s own active StewardshipRelationship — never files an escalation itself', async () => {
        mockStewardshipRelationshipsService.findAll.mockResolvedValue({
          data: [{ id: 'rel-001', stewardId: 'steward-001', status: StewardshipRelationshipStatus.ACTIVE }],
          total: 1, page: 1, limit: 1, totalPages: 1,
        } as never);
        mockAiRequests.runCompletion.mockResolvedValue({
          content: JSON.stringify([{ id: 'rel-001', rationale: 'You might benefit from reaching out this week.' }]),
          requestId: 'req-005',
        });
        mockRepo.findExistingPending.mockResolvedValue(null);
        mockRepo.create.mockResolvedValue(makeRecommendation({ opportunityId: null, relationshipId: 'rel-001' } as never));

        const result = await service.generate({ category: RecommendationCategory.STEWARD_ESCALATION }, USER);

        expect(mockStewardshipRelationshipsService.findAll).toHaveBeenCalledWith(
          expect.objectContaining({ memberId: USER.id, status: StewardshipRelationshipStatus.ACTIVE }),
          USER,
        );
        expect(mockAiRequests.runCompletion).toHaveBeenCalledWith(expect.objectContaining({ capability: AiCapability.RECOMMENDATION }));
        expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: USER.id, relationshipId: 'rel-001' }));
        expect(result).toHaveLength(1);
      });

      it('returns an empty array without calling the AI when the caller has no active StewardshipRelationship', async () => {
        mockStewardshipRelationshipsService.findAll.mockResolvedValue({
          data: [], total: 0, page: 1, limit: 1, totalPages: 0,
        } as never);

        const result = await service.generate({ category: RecommendationCategory.STEWARD_ESCALATION }, USER);

        expect(result).toEqual([]);
        expect(mockAiRequests.runCompletion).not.toHaveBeenCalled();
      });
    });
  });

  describe('approve / dismiss', () => {
    it('accepts a PENDING recommendation owned by the caller', async () => {
      mockRepo.findById.mockResolvedValue(makeRecommendation());
      mockRepo.update.mockResolvedValue(makeRecommendation({ status: AiRecommendationStatus.ACCEPTED, decidedAt: NOW }));

      const result = await service.approve('rec-001', USER);
      expect(result.status).toBe(AiRecommendationStatus.ACCEPTED);
    });

    it('rejects approving a non-PENDING recommendation', async () => {
      mockRepo.findById.mockResolvedValue(makeRecommendation({ status: AiRecommendationStatus.DISMISSED }));
      await expect(service.approve('rec-001', USER)).rejects.toThrow(ConflictException);
    });

    it('forbids a non-owner from approving', async () => {
      mockRepo.findById.mockResolvedValue(makeRecommendation());
      await expect(service.approve('rec-001', OTHER_USER)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a missing recommendation', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.dismiss('ghost', USER)).rejects.toThrow(NotFoundException);
    });

    it('dismisses a PENDING recommendation owned by the caller', async () => {
      mockRepo.findById.mockResolvedValue(makeRecommendation());
      mockRepo.update.mockResolvedValue(makeRecommendation({ status: AiRecommendationStatus.DISMISSED, decidedAt: NOW }));

      const result = await service.dismiss('rec-001', USER);
      expect(result.status).toBe(AiRecommendationStatus.DISMISSED);
    });
  });
});
