import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { JourneyStatus } from '@prisma/client';

export class CreateJourneyDto {
  @ApiProperty({ example: 'My learning journey' })
  @IsString() @MinLength(1)
  title: string;

  @ApiProperty({ description: 'Parent Goal ID' })
  @IsUUID()
  goalId: string;

  @ApiPropertyOptional({ enum: JourneyStatus, default: JourneyStatus.ACTIVE })
  @IsOptional() @IsEnum(JourneyStatus)
  status?: JourneyStatus;
}
