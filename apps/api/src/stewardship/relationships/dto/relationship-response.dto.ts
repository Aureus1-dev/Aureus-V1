import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  StewardshipEndReason, StewardshipRelationshipOrigin, StewardshipRelationshipStatus,
} from '@prisma/client';
import type { StewardshipRelationship } from '@prisma/client';

export class RelationshipResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() memberId: string;
  @ApiPropertyOptional({ nullable: true }) stewardId: string | null;
  @ApiProperty({ enum: StewardshipRelationshipStatus }) status: StewardshipRelationshipStatus;
  @ApiProperty({ enum: StewardshipRelationshipOrigin }) origin: StewardshipRelationshipOrigin;
  @ApiPropertyOptional({ nullable: true }) requestedById: string | null;
  @ApiPropertyOptional({ nullable: true }) assignedById: string | null;
  @ApiPropertyOptional({ nullable: true }) assignedByOrganizationId: string | null;
  @ApiPropertyOptional({ nullable: true }) recommendedById: string | null;
  @ApiPropertyOptional({ enum: StewardshipEndReason, nullable: true }) endReason: StewardshipEndReason | null;
  @ApiPropertyOptional({ nullable: true }) endedById: string | null;
  @ApiPropertyOptional({ nullable: true }) endedAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) activatedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(r: StewardshipRelationship): RelationshipResponseDto {
    const dto = new RelationshipResponseDto();
    Object.assign(dto, r);
    return dto;
  }
}
