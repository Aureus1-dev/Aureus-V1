import { Injectable, NotFoundException } from '@nestjs/common';
import { GoalStatus, MilestoneStatus, PodMembershipStatus, StewardshipRelationshipStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
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

const RECENT_GOALS_LIMIT = 10;
const RECENT_SAVED_ITEMS_LIMIT = 5;
const RECENT_CONVERSATION_MESSAGES_LIMIT = 3;

export interface MemoryGoal {
  id: string;
  title: string;
  status: GoalStatus;
}

export interface MemoryActiveJourney {
  id: string;
  goalId: string;
  title: string;
  completedMilestones: number;
  totalMilestones: number;
}

export interface MemorySavedItem {
  id: string;
  title: string;
}

export interface MemoryPodMembership {
  podId: string;
  podName: string;
  status: PodMembershipStatus;
}

export interface MemoryStewardshipRelationship {
  id: string;
  stewardId: string | null;
  status: StewardshipRelationshipStatus;
}

export interface InstitutionalMemoryContext {
  goals: MemoryGoal[];
  activeJourney: MemoryActiveJourney | null;
  savedOpportunities: MemorySavedItem[];
  savedResources: MemorySavedItem[];
  podMemberships: MemoryPodMembership[];
  stewardshipRelationship: MemoryStewardshipRelationship | null;
  recentConversationSnippets: string[];
}

/**
 * Shared Institutional Memory (PR-004 Intelligence Layer). Assembles a
 * read-only context bundle from across the member's existing data — Goals,
 * Journeys/Milestones, saved Opportunities/Resources, Pod memberships, the
 * active Stewardship relationship, and recent conversation snippets — so
 * the AI Orchestrator can decide what matters right now instead of relying
 * only on the current request. Every field is read through the target
 * domain's own existing service (constructor DI, not repository injection),
 * exactly the convention `InsightsService`/`RecommendationsService` already
 * use for cross-domain reads within the AI module (ADR-015 Decision 5) —
 * this service adds no new business logic, only assembles what already
 * exists. Nothing here is cached or persisted; it's rebuilt fresh on every
 * call, which is deliberately simple for this first version (a documented
 * scope decision, not an oversight — see the PR-004 readiness report).
 */
@Injectable()
export class InstitutionalMemoryService {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly journeysService: JourneysService,
    private readonly milestonesService: MilestonesService,
    private readonly opportunitiesService: OpportunitiesService,
    private readonly savedOpportunitiesService: SavedOpportunitiesService,
    private readonly resourcesService: ResourcesService,
    private readonly savedResourcesService: SavedResourcesService,
    private readonly podsService: PodsService,
    private readonly podMembershipsService: PodMembershipsService,
    private readonly stewardshipRelationshipsService: StewardshipRelationshipsService,
    private readonly conversationsService: ConversationsService,
  ) {}

  async assembleContext(caller: AuthenticatedUser): Promise<InstitutionalMemoryContext> {
    const [goals, savedOpportunities, savedResources, podMemberships, stewardshipRelationship, recentConversationSnippets] =
      await Promise.all([
        this.loadGoals(caller),
        this.loadSavedOpportunities(caller.id),
        this.loadSavedResources(caller.id),
        this.loadPodMemberships(caller),
        this.loadActiveStewardshipRelationship(caller),
        this.loadRecentConversationSnippets(caller),
      ]);

    const activeJourney = await this.loadActiveJourney(goals, caller);

    return {
      goals,
      activeJourney,
      savedOpportunities,
      savedResources,
      podMemberships,
      stewardshipRelationship,
      recentConversationSnippets,
    };
  }

  private async loadGoals(caller: AuthenticatedUser): Promise<MemoryGoal[]> {
    const result = await this.goalsService.findAll({ page: 1, limit: RECENT_GOALS_LIMIT }, caller);
    return result.data.map((g) => ({ id: g.id, title: g.title, status: g.status }));
  }

  private async loadActiveJourney(goals: MemoryGoal[], caller: AuthenticatedUser): Promise<MemoryActiveJourney | null> {
    const activeGoal = goals.find((g) => g.status === GoalStatus.ACTIVE);
    if (!activeGoal) return null;

    try {
      const journey = await this.journeysService.findByGoalId(activeGoal.id, caller);
      const milestones = await this.milestonesService.findAll({ page: 1, limit: 100, journeyId: journey.id }, caller);
      const completedMilestones = milestones.data.filter((m) => m.status === MilestoneStatus.COMPLETED).length;
      return {
        id: journey.id,
        goalId: activeGoal.id,
        title: journey.title,
        completedMilestones,
        totalMilestones: milestones.data.length,
      };
    } catch (err) {
      if (err instanceof NotFoundException) return null;
      throw err;
    }
  }

  private async loadSavedOpportunities(userId: string): Promise<MemorySavedItem[]> {
    const saved = await this.savedOpportunitiesService.findByUser(userId);
    const recent = saved.slice(0, RECENT_SAVED_ITEMS_LIMIT);
    return this.resolveTitles(recent.map((s) => s.opportunityId), (id) => this.opportunitiesService.findById(id));
  }

  private async loadSavedResources(userId: string): Promise<MemorySavedItem[]> {
    const saved = await this.savedResourcesService.findByUser(userId);
    const recent = saved.slice(0, RECENT_SAVED_ITEMS_LIMIT);
    return this.resolveTitles(recent.map((s) => s.resourceId), (id) => this.resourcesService.findById(id));
  }

  private async resolveTitles(ids: string[], fetch: (id: string) => Promise<{ id: string; title: string }>): Promise<MemorySavedItem[]> {
    const resolved = await Promise.all(
      ids.map(async (id) => {
        try {
          const entity = await fetch(id);
          return { id: entity.id, title: entity.title };
        } catch {
          return null;
        }
      }),
    );
    return resolved.filter((item): item is MemorySavedItem => item !== null);
  }

  private async loadPodMemberships(caller: AuthenticatedUser): Promise<MemoryPodMembership[]> {
    const memberships = await this.podMembershipsService.findMine(caller);
    const active = memberships.filter((m) => m.status === PodMembershipStatus.ACTIVE).slice(0, RECENT_SAVED_ITEMS_LIMIT);

    const withNames = await Promise.all(
      active.map(async (m) => {
        try {
          const pod = await this.podsService.findById(m.podId);
          return { podId: m.podId, podName: pod.name, status: m.status };
        } catch {
          return null;
        }
      }),
    );
    return withNames.filter((item): item is MemoryPodMembership => item !== null);
  }

  private async loadActiveStewardshipRelationship(caller: AuthenticatedUser): Promise<MemoryStewardshipRelationship | null> {
    const result = await this.stewardshipRelationshipsService.findAll(
      { page: 1, limit: 1, memberId: caller.id, status: StewardshipRelationshipStatus.ACTIVE },
      caller,
    );
    const relationship = result.data[0];
    if (!relationship) return null;
    return { id: relationship.id, stewardId: relationship.stewardId, status: relationship.status };
  }

  private async loadRecentConversationSnippets(caller: AuthenticatedUser): Promise<string[]> {
    const conversations = await this.conversationsService.findMine({ page: 1, limit: 1 }, caller);
    const mostRecent = conversations.data[0];
    if (!mostRecent) return [];

    const messages = await this.conversationsService.findMessages(mostRecent.id, caller);
    return messages
      .slice(-RECENT_CONVERSATION_MESSAGES_LIMIT)
      .map((m) => m.content.length > 200 ? `${m.content.slice(0, 200)}…` : m.content);
  }
}
