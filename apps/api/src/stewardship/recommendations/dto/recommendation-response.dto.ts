import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StewardshipRecommendationType } from '@prisma/client';
import type { StewardshipRecommendation } from '@prisma/client';

export class RecommendationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() relationshipId: string;
  @ApiProperty({ enum: StewardshipRecommendationType }) type: StewardshipRecommendationType;
  @ApiPropertyOptional({ nullable: true }) opportunityId: string | null;
  @ApiPropertyOptional({ nullable: true }) resourceId: string | null;
  @ApiPropertyOptional({ nullable: true }) note: string | null;
  @ApiProperty() createdById: string;
  @ApiProperty() createdAt: Date;

  static fromEntity(r: StewardshipRecommendation): RecommendationResponseDto {
    const dto = new RecommendationResponseDto();
    Object.assign(dto, r);
    return dto;
  }
}
