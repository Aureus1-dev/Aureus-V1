import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  GuardianChildRelationship,
  ParentChildRelationshipStatus,
} from '@prisma/client';

export class GuardianChildRelationshipResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) guardianUserId!: string;
  @ApiProperty({ format: 'uuid' }) childUserId!: string;
  @ApiProperty({ enum: ParentChildRelationshipStatus }) status!: ParentChildRelationshipStatus;
  @ApiProperty() guardianAttestedAt!: Date;
  @ApiPropertyOptional({ nullable: true }) childAssentedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) revokedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

  static fromEntity(entity: GuardianChildRelationship): GuardianChildRelationshipResponseDto {
    return { ...entity };
  }
}

export class GuardianChildSummaryDto {
  @ApiProperty({ format: 'uuid' }) relationshipId!: string;
  @ApiProperty({ format: 'uuid' }) childUserId!: string;
  @ApiPropertyOptional({ nullable: true }) displayName!: string | null;
}
