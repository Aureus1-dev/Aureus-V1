import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WardLeadStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const HUMAN_STATES = [
  WardLeadStatus.ACCEPTED,
  WardLeadStatus.CONTACTED,
  WardLeadStatus.CLOSED,
  WardLeadStatus.LOST,
] as const;

export class TransitionWardLeadDto {
  @ApiProperty({ enum: HUMAN_STATES })
  @IsIn(HUMAN_STATES)
  status: (typeof HUMAN_STATES)[number];

  @ApiPropertyOptional({ minLength: 3, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}
