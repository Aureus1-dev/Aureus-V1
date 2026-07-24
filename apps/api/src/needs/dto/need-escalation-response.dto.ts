import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NeedEscalationStatus } from '@prisma/client';
import type { NeedEscalation } from '@prisma/client';

export class NeedEscalationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() statedNeedId: string;
  @ApiPropertyOptional({ nullable: true }) reason: string | null;
  @ApiProperty({ enum: NeedEscalationStatus }) status: NeedEscalationStatus;
  @ApiPropertyOptional({ nullable: true }) acknowledgedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) resolutionNotes: string | null;
  @ApiPropertyOptional({ nullable: true }) resolvedAt: Date | null;
  @ApiProperty() createdAt: Date;

  static fromEntity(e: NeedEscalation): NeedEscalationResponseDto {
    const dto = new NeedEscalationResponseDto();
    dto.id = e.id;
    dto.statedNeedId = e.statedNeedId;
    dto.reason = e.reason;
    dto.status = e.status;
    dto.acknowledgedAt = e.acknowledgedAt;
    dto.resolutionNotes = e.resolutionNotes;
    dto.resolvedAt = e.resolvedAt;
    dto.createdAt = e.createdAt;
    return dto;
  }
}
