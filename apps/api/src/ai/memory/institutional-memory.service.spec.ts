import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GoalStatus, MilestoneStatus, PodMembershipStatus, StewardshipRelationshipStatus, UserRole } from '@prisma/client';
import { InstitutionalMemoryService } from './institutional-memory.service';
import { GoalsService } from '../../goals/goals.service';
import { JourneysService } from '../../journeys/journeys.service';
import { MilestonesService } from '../../milestones/milestones.service';
import { OpportunitiesService } from '../../opportunities/opportunities.service';
import { SavedOpportunitiesService } from '../../opportunities/saved/saved-opportunities.service';
import { ResourcesService } from '../../resources/resources.service';
import { SavedResourcesService } from '../../resources/saved/saved-resources.service';
import { PodsService } from '../../pods/pods.service';
import { PodMembershipsService } from '../../pods/memberships/pod-memberships.service';
import { StewardshipRelationshipsService } from '../../stewardship/relationships/stewardship-relationships.service';
import { ConversationsService } from '../conversations/conversations.service';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

const USER: AuthenticatedUser = { id: 'user-001', email: 'user@example.com', roles: [UserRole.MEMBER] };

const mockGoalsService = { findAll: jest.fn() } as unknown as jest.Mocked<GoalsService>;
const mockJourneysService = { findByGoalId: jest.fn() } as unknown as jest.Mocked<JourneysService>;
const mockMilestonesService = { findAll: jest.fn() } as unknown as jest.Mocked<MilestonesService>;
const mockOpportunitiesService = { findById: jest.fn() } as unknown as jest.Mocked<OpportunitiesService>;
const mockSavedOpportunitiesService = { findByUser: jest.fn() } as unknown as jest.Mocked<SavedOpportunitiesService>;
const mockResourcesService = { findById: jest.fn() } as unknown as jest.Mocked<ResourcesService>;
const mockSavedResourcesService = { findByUser: jest.fn() } as unknown as jest.Mocked<SavedResourcesService>;
const mockPodsService = { findById: jest.fn() } as unknown as jest.Mocked<PodsService>;
const mockPodMembershipsService = { findMine: jest.fn() } as unknown as jest.Mocked<PodMembershipsService>;
const mockStewardshipRelationshipsService = { findAll: jest.fn() } as unknown as jest.Mocked<StewardshipRelationshipsService>;
const mockConversationsService = { findMine: jest.fn(), findMessages: jest.fn() } as unknown as jest.Mocked<ConversationsService>;

describe('InstitutionalMemoryService', () => {
  let service: InstitutionalMemoryService;

  beforeEach(async () => {
    const m = await Test.createTestingModule({
      providers: [
        InstitutionalMemoryService,
        { provide: GoalsService, useValue: mockGoalsService },
        { provide: JourneysService, useValue: mockJourneysService },
        { provide: MilestonesService, useValue: mockMilestonesService },
        { provide: OpportunitiesService, useValue: mockOpportunitiesService },
        { provide: SavedOpportunitiesService, useValue: mockSavedOpportunitiesService },
        { provide: ResourcesService, useValue: mockResourcesService },
        { provide: SavedResourcesService, useValue: mockSavedResourcesService },
        { provide: PodsService, useValue: mockPodsService },
        { provide: PodMembershipsService, useValue: mockPodMembershipsService },
        { provide: StewardshipRelationshipsService, useValue: mockStewardshipRelationshipsService },
        { provide: ConversationsService, useValue: mockConversationsService },
      ],
    }).compile();
    service = m.get(InstitutionalMemoryService);
    jest.clearAllMocks();

    mockSavedOpportunitiesService.findByUser.mockResolvedValue([]);
    mockSavedResourcesService.findByUser.mockResolvedValue([]);
    mockPodMembershipsService.findMine.mockResolvedValue([]);
    mockStewardshipRelationshipsService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 1, totalPages: 0 } as never);
    mockConversationsService.findMine.mockResolvedValue({ data: [], total: 0, page: 1, limit: 1, totalPages: 0 } as never);
  });

  it('assembles goals and resolves the active Journey with milestone progress', async () => {
    mockGoalsService.findAll.mockResolvedValue({
      data: [
        { id: 'goal-001', title: 'Save $1000', status: GoalStatus.ACTIVE },
        { id: 'goal-002', title: 'Finish course', status: GoalStatus.ACHIEVED },
      ],
      total: 2, page: 1, limit: 10, totalPages: 1,
    } as never);
    mockJourneysService.findByGoalId.mockResolvedValue({ id: 'journey-001', goalId: 'goal-001', title: 'Savings Journey', status: 'ACTIVE' } as never);
    mockMilestonesService.findAll.mockResolvedValue({
      data: [
        { id: 'm-1', title: 'Open account', status: MilestoneStatus.COMPLETED },
        { id: 'm-2', title: 'First deposit', status: MilestoneStatus.PENDING },
      ],
      total: 2, page: 1, limit: 100, totalPages: 1,
    } as never);

    const context = await service.assembleContext(USER);

    expect(context.goals).toHaveLength(2);
    expect(context.activeJourney).toEqual({
      id: 'journey-001', goalId: 'goal-001', title: 'Savings Journey', completedMilestones: 1, totalMilestones: 2,
    });
  });

  it('returns a null active Journey when the active Goal has no Journey yet (NotFoundException swallowed)', async () => {
    mockGoalsService.findAll.mockResolvedValue({
      data: [{ id: 'goal-001', title: 'Save $1000', status: GoalStatus.ACTIVE }],
      total: 1, page: 1, limit: 10, totalPages: 1,
    } as never);
    mockJourneysService.findByGoalId.mockRejectedValue(new NotFoundException('no journey'));

    const context = await service.assembleContext(USER);

    expect(context.activeJourney).toBeNull();
  });

  it('re-throws non-NotFoundException errors while resolving the active Journey', async () => {
    mockGoalsService.findAll.mockResolvedValue({
      data: [{ id: 'goal-001', title: 'Save $1000', status: GoalStatus.ACTIVE }],
      total: 1, page: 1, limit: 10, totalPages: 1,
    } as never);
    mockJourneysService.findByGoalId.mockRejectedValue(new Error('boom'));

    await expect(service.assembleContext(USER)).rejects.toThrow('boom');
  });

  it('returns a null active Journey when there is no ACTIVE goal', async () => {
    mockGoalsService.findAll.mockResolvedValue({
      data: [{ id: 'goal-001', title: 'Old goal', status: GoalStatus.ACHIEVED }],
      total: 1, page: 1, limit: 10, totalPages: 1,
    } as never);

    const context = await service.assembleContext(USER);

    expect(context.activeJourney).toBeNull();
    expect(mockJourneysService.findByGoalId).not.toHaveBeenCalled();
  });

  it('resolves saved Opportunity/Resource titles and silently drops ones that fail to resolve', async () => {
    mockGoalsService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 } as never);
    mockSavedOpportunitiesService.findByUser.mockResolvedValue([
      { opportunityId: 'opp-001' }, { opportunityId: 'opp-gone' },
    ] as never);
    mockOpportunitiesService.findById.mockImplementation((id: string) =>
      id === 'opp-001' ? Promise.resolve({ id: 'opp-001', title: 'Scholarship' } as never) : Promise.reject(new NotFoundException()));

    const context = await service.assembleContext(USER);

    expect(context.savedOpportunities).toEqual([{ id: 'opp-001', title: 'Scholarship' }]);
  });

  it('filters Pod memberships to ACTIVE and resolves Pod names', async () => {
    mockGoalsService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 } as never);
    mockPodMembershipsService.findMine.mockResolvedValue([
      { podId: 'pod-001', status: PodMembershipStatus.ACTIVE },
      { podId: 'pod-002', status: PodMembershipStatus.REMOVED },
    ] as never);
    mockPodsService.findById.mockResolvedValue({ id: 'pod-001', name: 'Riverside Home Pod' } as never);

    const context = await service.assembleContext(USER);

    expect(context.podMemberships).toEqual([{ podId: 'pod-001', podName: 'Riverside Home Pod', status: PodMembershipStatus.ACTIVE }]);
    expect(mockPodsService.findById).toHaveBeenCalledTimes(1);
  });

  it("resolves the caller's own active StewardshipRelationship", async () => {
    mockGoalsService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 } as never);
    mockStewardshipRelationshipsService.findAll.mockResolvedValue({
      data: [{ id: 'rel-001', stewardId: 'steward-001', status: StewardshipRelationshipStatus.ACTIVE }],
      total: 1, page: 1, limit: 1, totalPages: 1,
    } as never);

    const context = await service.assembleContext(USER);

    expect(mockStewardshipRelationshipsService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ memberId: USER.id, status: StewardshipRelationshipStatus.ACTIVE }),
      USER,
    );
    expect(context.stewardshipRelationship).toEqual({ id: 'rel-001', stewardId: 'steward-001', status: StewardshipRelationshipStatus.ACTIVE });
  });

  it('truncates recent conversation snippets to 200 characters', async () => {
    mockGoalsService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 } as never);
    mockConversationsService.findMine.mockResolvedValue({
      data: [{ id: 'conv-001' }], total: 1, page: 1, limit: 1, totalPages: 1,
    } as never);
    const longMessage = 'x'.repeat(250);
    mockConversationsService.findMessages.mockResolvedValue([
      { content: 'short message' }, { content: longMessage },
    ] as never);

    const context = await service.assembleContext(USER);

    expect(context.recentConversationSnippets).toEqual(['short message', `${'x'.repeat(200)}…`]);
  });

  it('returns no conversation snippets when the caller has no conversations', async () => {
    mockGoalsService.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 } as never);

    const context = await service.assembleContext(USER);

    expect(context.recentConversationSnippets).toEqual([]);
    expect(mockConversationsService.findMessages).not.toHaveBeenCalled();
  });
});
