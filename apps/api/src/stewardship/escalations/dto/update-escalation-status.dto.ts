import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { StewardshipEscalationStatus } from '@prisma/client';

export class UpdateEscalationStatusDto {
  @ApiProperty({ enum: StewardshipEscalationStatus })
  @IsEnum(StewardshipEscalationStatus)
  status: StewardshipEscalationStatus;
}
