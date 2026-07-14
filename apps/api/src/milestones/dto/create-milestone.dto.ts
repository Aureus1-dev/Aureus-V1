import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { MilestoneStatus } from '@prisma/client';

export class CreateMilestoneDto {
  @ApiProperty({ example: 'Complete beginner module' })
  @IsString() @MinLength(1)
  title: string;

  @ApiProperty({ description: 'Parent Journey ID' })
  @IsUUID()
  journeyId: string;

  @ApiPropertyOptional({ enum: MilestoneStatus, default: MilestoneStatus.PENDING })
  @IsOptional() @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  position?: number;
}
