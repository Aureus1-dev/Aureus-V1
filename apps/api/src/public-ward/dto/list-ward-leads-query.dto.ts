import { ApiPropertyOptional } from '@nestjs/swagger';
import { WardLeadStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListWardLeadsQueryDto {
  @ApiPropertyOptional({ enum: WardLeadStatus })
  @IsOptional()
  @IsEnum(WardLeadStatus)
  status?: WardLeadStatus;
}
