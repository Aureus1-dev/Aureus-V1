import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class OrganizationAssignStewardDto {
  @ApiProperty({ description: 'Member UUID to assign a steward to' })
  @IsUUID()
  memberId: string;

  @ApiProperty({ description: 'Steward UUID being assigned' })
  @IsUUID()
  stewardId: string;

  @ApiProperty({ description: 'Verified Organization UUID the caller is an ADMIN representative of' })
  @IsUUID()
  organizationId: string;
}
