import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingCadence } from '@prisma/client';
import type { PodMeetingSchedule } from '@prisma/client';

export class ScheduleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() podId: string;
  @ApiProperty({ enum: MeetingCadence }) cadence: MeetingCadence;
  @ApiPropertyOptional({ nullable: true }) dayOfWeek: number | null;
  @ApiPropertyOptional({ nullable: true }) timeOfDay: string | null;
  @ApiPropertyOptional({ nullable: true }) location: string | null;
  @ApiPropertyOptional({ nullable: true }) durationMinutes: number | null;
  @ApiProperty() createdById: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(s: PodMeetingSchedule): ScheduleResponseDto {
    const dto = new ScheduleResponseDto();
    Object.assign(dto, s);
    return dto;
  }
}
