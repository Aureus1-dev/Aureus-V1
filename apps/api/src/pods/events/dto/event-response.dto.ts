import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PodEventStatus, PodEventType } from '@prisma/client';
import type { PodEvent } from '@prisma/client';

export class EventResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() podId: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty({ enum: PodEventType }) type: PodEventType;
  @ApiProperty() startsAt: Date;
  @ApiPropertyOptional({ nullable: true }) endsAt: Date | null;
  @ApiPropertyOptional({ nullable: true }) location: string | null;
  @ApiProperty() createdById: string;
  @ApiProperty({ enum: PodEventStatus }) status: PodEventStatus;
  @ApiProperty() createdAt: Date;

  static fromEntity(e: PodEvent): EventResponseDto {
    const dto = new EventResponseDto();
    Object.assign(dto, e);
    return dto;
  }
}

/** Upcoming RSVPs — visible to fellow Pod members (Founder Decision #5). */
export class RsvpResponseDto {
  @ApiProperty() userId: string;
  @ApiProperty() response: string;

  static fromEntity(r: { userId: string; response: string }): RsvpResponseDto {
    const dto = new RsvpResponseDto();
    dto.userId = r.userId;
    dto.response = r.response;
    return dto;
  }
}

export class PrefillDefaultsResponseDto {
  @ApiPropertyOptional({ nullable: true }) suggestedStartsAt: string | null;
  @ApiPropertyOptional({ nullable: true }) location: string | null;
  @ApiPropertyOptional({ nullable: true }) durationMinutes: number | null;
}
