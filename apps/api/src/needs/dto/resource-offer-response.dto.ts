import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceOfferResponse } from '@prisma/client';
import type { ResourceOffer } from '@prisma/client';

export class ResourceOfferResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() statedNeedId: string;
  @ApiProperty() citySheetEntryId: string;
  @ApiProperty({ enum: ResourceOfferResponse }) response: ResourceOfferResponse;
  @ApiProperty() offeredAt: Date;
  @ApiPropertyOptional({ nullable: true }) respondedAt: Date | null;

  static fromEntity(e: ResourceOffer): ResourceOfferResponseDto {
    const dto = new ResourceOfferResponseDto();
    dto.id = e.id;
    dto.statedNeedId = e.statedNeedId;
    dto.citySheetEntryId = e.citySheetEntryId;
    dto.response = e.response;
    dto.offeredAt = e.offeredAt;
    dto.respondedAt = e.respondedAt;
    return dto;
  }
}
