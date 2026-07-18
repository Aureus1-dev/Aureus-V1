import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiRecommendationStatus } from '@prisma/client';
import type { AiRecommendation } from '@prisma/client';

export class RecommendationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiPropertyOptional({ nullable: true }) opportunityId: string | null;
  @ApiPropertyOptional({ nullable: true }) resourceId: string | null;
  @ApiPropertyOptional({ nullable: true }) courseId: string | null;
  @ApiPropertyOptional({ nullable: true }) podId: string | null;
  @ApiPropertyOptional({ nullable: true }) relationshipId: string | null;
  @ApiProperty() rationale: string;
  @ApiProperty({ enum: AiRecommendationStatus }) status: AiRecommendationStatus;
  @ApiPropertyOptional({ nullable: true }) decidedAt: Date | null;
  @ApiProperty() createdAt: Date;

  static fromEntity(r: AiRecommendation): RecommendationResponseDto {
    const dto = new RecommendationResponseDto();
    Object.assign(dto, r);
    return dto;
  }
}
