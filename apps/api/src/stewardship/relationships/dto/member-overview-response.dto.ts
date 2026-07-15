import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoalResponseDto } from '../../../goals/dto/goal-response.dto';
import { JourneyResponseDto } from '../../../journeys/dto/journey-response.dto';
import { MilestoneResponseDto } from '../../../milestones/dto/milestone-response.dto';
import { TaskResponseDto } from '../../../tasks/dto/task-response.dto';
import { ProfileResponseDto } from '../../../users/profile/dto/profile-response.dto';

/**
 * A steward's read-only view of an assigned member's plan (PA-012: "View the
 * member's Aureus profile... goals, journeys, milestones, tasks, and
 * progress"). Flat lists rather than a nested tree — a foundation the
 * consuming client composes, not a fully productionized aggregation.
 */
export class MemberOverviewResponseDto {
  @ApiPropertyOptional({ nullable: true, type: ProfileResponseDto }) profile: ProfileResponseDto | null;
  @ApiProperty({ type: [GoalResponseDto] }) goals: GoalResponseDto[];
  @ApiProperty({ type: [JourneyResponseDto] }) journeys: JourneyResponseDto[];
  @ApiProperty({ type: [MilestoneResponseDto] }) milestones: MilestoneResponseDto[];
  @ApiProperty({ type: [TaskResponseDto] }) tasks: TaskResponseDto[];
}
