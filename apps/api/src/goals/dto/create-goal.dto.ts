import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { GoalStatus } from '@prisma/client';

export class CreateGoalDto {
  @ApiProperty({ example: 'Learn TypeScript deeply' })
  @IsString()
  @MinLength(1)
  title: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Owner user ID' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: GoalStatus, default: GoalStatus.ACTIVE })
  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;
}
