import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ActivateRelationshipDto {
  @ApiPropertyOptional({ description: 'Steward UUID to confirm/assign — required if the pending relationship has none yet' })
  @IsOptional() @IsUUID()
  stewardId?: string;

  @ApiPropertyOptional({ description: 'Verified Organization UUID, required when activating as an organization ADMIN representative' })
  @IsOptional() @IsUUID()
  organizationId?: string;
}
