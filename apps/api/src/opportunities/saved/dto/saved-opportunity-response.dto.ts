import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrackingStatus } from '@prisma/client';
import type { SavedOpportunity } from '@prisma/client';

export class SavedOpportunityResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() opportunityId: string;
  @ApiProperty() isFavorite: boolean;
  @ApiProperty({ enum: TrackingStatus }) trackingStatus: TrackingStatus;
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiProperty() savedAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(s: SavedOpportunity): SavedOpportunityResponseDto {
    const dto = new SavedOpportunityResponseDto();
    Object.assign(dto, s);
    return dto;
  }
}
