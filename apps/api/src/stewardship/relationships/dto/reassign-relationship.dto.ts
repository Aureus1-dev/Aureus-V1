import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsUUID } from 'class-validator';
import { StewardshipEndReason } from '@prisma/client';

export class ReassignRelationshipDto {
  @ApiProperty({ description: 'Steward UUID the member is being reassigned to' })
  @IsUUID()
  newStewardId: string;

  @ApiProperty({
    enum: [StewardshipEndReason.ORGANIZATION_REASSIGNMENT, StewardshipEndReason.ADMIN_REASSIGNMENT],
    description: 'Reassignment is only valid for these two reasons',
  })
  @IsEnum(StewardshipEndReason)
  @IsIn([StewardshipEndReason.ORGANIZATION_REASSIGNMENT, StewardshipEndReason.ADMIN_REASSIGNMENT])
  reason: StewardshipEndReason;

  @ApiPropertyOptional({ description: 'Verified Organization UUID, required when reason is ORGANIZATION_REASSIGNMENT' })
  @IsOptional() @IsUUID()
  organizationId?: string;
}
