import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PodEventType } from '@prisma/client';

export class CreateEventDto {
  @ApiProperty({ minLength: 3 })
  @IsString() @MinLength(3)
  title: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PodEventType, default: PodEventType.MEETING })
  @IsOptional() @IsEnum(PodEventType)
  type?: PodEventType;

  @ApiProperty()
  @IsDateString()
  startsAt: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ example: 'Community Center, Room 2 — or "virtual: https://..."' })
  @IsOptional() @IsString()
  location?: string;
}
