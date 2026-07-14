import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { MilestoneStatus } from '@prisma/client';

export class ListMilestonesQueryDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsUUID() journeyId?: string;
  @ApiPropertyOptional({ enum: MilestoneStatus }) @IsOptional() @IsEnum(MilestoneStatus) status?: MilestoneStatus;
}
