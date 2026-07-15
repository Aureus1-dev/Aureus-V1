import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { StewardshipEndReason } from '@prisma/client';

export class EndRelationshipDto {
  @ApiProperty({ enum: StewardshipEndReason })
  @IsEnum(StewardshipEndReason)
  reason: StewardshipEndReason;

  @ApiPropertyOptional({ description: 'Verified Organization UUID, required when ending as an organization ADMIN representative for ORGANIZATION_REASSIGNMENT' })
  @IsOptional() @IsUUID()
  organizationId?: string;
}
