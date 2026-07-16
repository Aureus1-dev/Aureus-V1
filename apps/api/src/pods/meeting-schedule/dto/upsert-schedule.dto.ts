import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MeetingCadence } from '@prisma/client';

export class UpsertScheduleDto {
  @ApiProperty({ enum: MeetingCadence })
  @IsEnum(MeetingCadence)
  cadence: MeetingCadence;

  @ApiPropertyOptional({ minimum: 0, maximum: 6, description: '0 (Sunday) - 6 (Saturday), omit for AD_HOC' })
  @IsOptional() @IsInt() @Min(0) @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({ example: '19:00' })
  @IsOptional() @IsString()
  timeOfDay?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  location?: string;

  @ApiPropertyOptional({ minimum: 15 })
  @IsOptional() @IsInt() @Min(15)
  durationMinutes?: number;
}
