import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AdminAssignStewardDto {
  @ApiProperty({ description: 'Member UUID to assign a steward to' })
  @IsUUID()
  memberId: string;

  @ApiProperty({ description: 'Steward UUID being assigned' })
  @IsUUID()
  stewardId: string;
}
