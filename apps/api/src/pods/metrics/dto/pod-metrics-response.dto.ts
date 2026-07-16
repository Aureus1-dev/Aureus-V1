import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Aggregate, Pod-level only — never a per-member breakdown (§1.10, §6).
 * No PodMetrics table exists; every field here is computed on read.
 */
export class PodMetricsResponseDto {
  @ApiProperty() podId: string;
  @ApiProperty() activeMemberCount: number;
  @ApiPropertyOptional({ nullable: true, description: '0-100, aggregate attendance rate across held meetings; null if no data yet' })
  attendanceRatePercent: number | null;
  @ApiProperty() serviceProjectCount: number;
  @ApiProperty() serviceProjectsCompleted: number;
  @ApiProperty() eventsHeldLast90Days: number;
  @ApiProperty() generatedAt: Date;
}
