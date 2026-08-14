import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignWardLeadDto {
  @ApiProperty({ description: 'User UUID of an eligible member of this same business tenant' })
  @IsUUID()
  assignedToId: string;
}
