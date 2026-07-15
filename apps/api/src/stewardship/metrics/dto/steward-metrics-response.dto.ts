import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * A foundation for steward performance metrics (PA-012), expandable without
 * schema redesign. `averageResponseTimeHours` and `memberSatisfactionScore`
 * have no data source yet — instrumenting them (a `respondedAt` timestamp on
 * notes/escalations; a satisfaction rating captured at relationship close)
 * is a named future extension, not implemented here. They are reserved in
 * this response shape now so wiring them up later is additive, not breaking.
 */
export class StewardMetricsResponseDto {
  @ApiProperty() stewardId: string;
  @ApiProperty({ description: 'Current count of ACTIVE assigned members' }) activeMemberCount: number;
  @ApiProperty({ description: "The steward's configured maximum active-member capacity" }) capacity: number;
  @ApiProperty({ description: 'Count of StewardshipTask rows with status COMPLETED across all relationships' }) tasksCompleted: number;
  @ApiProperty({ description: 'Count of escalations with status RESOLVED or CLOSED across all relationships' }) escalationsResolved: number;
  @ApiPropertyOptional({ nullable: true, description: 'Percent (0-100) of assigned members\' Goals with status COMPLETED; null if no goals exist yet' })
  memberGoalCompletionRate: number | null;
  @ApiPropertyOptional({ nullable: true, description: "Average percent (0-100) of milestones COMPLETED across assigned members' journeys; null if no journeys exist yet" })
  averageJourneyProgress: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'Reserved for future instrumentation — not yet computed' })
  averageResponseTimeHours: number | null;
  @ApiPropertyOptional({ nullable: true, description: 'Reserved for future instrumentation — not yet computed' })
  memberSatisfactionScore: number | null;
  @ApiProperty() generatedAt: Date;
}
