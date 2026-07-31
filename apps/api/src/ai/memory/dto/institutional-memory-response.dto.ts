import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoalStatus, PodMembershipStatus, StewardshipRelationshipStatus } from '@prisma/client';

/**
 * Response shapes for `GET /memory/me` (Living Steward Workspace redesign,
 * right-hand Steward context panel). Mirrors `InstitutionalMemoryContext`
 * (`institutional-memory.service.ts`) field-for-field — this only adds
 * Swagger typing over a context bundle that already existed and was
 * already fully assembled, read-only, from each domain's own existing
 * service; no new business logic.
 */
export class MemoryGoalDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty({ enum: GoalStatus }) status: GoalStatus;
}

export class MemoryActiveJourneyDto {
  @ApiProperty() id: string;
  @ApiProperty() goalId: string;
  @ApiProperty() title: string;
  @ApiProperty() completedMilestones: number;
  @ApiProperty() totalMilestones: number;
}

export class MemorySavedItemDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
}

export class MemoryPodMembershipDto {
  @ApiProperty() podId: string;
  @ApiProperty() podName: string;
  @ApiProperty({ enum: PodMembershipStatus }) status: PodMembershipStatus;
}

export class MemoryStewardshipRelationshipDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ nullable: true }) stewardId: string | null;
  @ApiProperty({ enum: StewardshipRelationshipStatus }) status: StewardshipRelationshipStatus;
}

export class InstitutionalMemoryResponseDto {
  @ApiProperty({ type: [MemoryGoalDto] })
  goals: MemoryGoalDto[];

  @ApiPropertyOptional({ type: MemoryActiveJourneyDto, nullable: true })
  activeJourney: MemoryActiveJourneyDto | null;

  @ApiProperty({ type: [MemorySavedItemDto] })
  savedOpportunities: MemorySavedItemDto[];

  @ApiProperty({ type: [MemorySavedItemDto] })
  savedResources: MemorySavedItemDto[];

  @ApiProperty({ type: [MemoryPodMembershipDto] })
  podMemberships: MemoryPodMembershipDto[];

  @ApiPropertyOptional({ type: MemoryStewardshipRelationshipDto, nullable: true })
  stewardshipRelationship: MemoryStewardshipRelationshipDto | null;

  @ApiProperty({ type: [String], description: 'Truncated snippets from the most recent conversation, newest last.' })
  recentConversationSnippets: string[];
}
