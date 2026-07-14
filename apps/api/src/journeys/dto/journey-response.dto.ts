import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JourneyStatus } from '@prisma/client';
import type { Journey } from '@prisma/client';

export class JourneyResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty({ enum: JourneyStatus }) status: JourneyStatus;
  @ApiProperty() goalId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ nullable: true }) deletedAt: Date | null;

  static fromEntity(j: Journey): JourneyResponseDto {
    const dto = new JourneyResponseDto();
    dto.id = j.id; dto.title = j.title; dto.status = j.status;
    dto.goalId = j.goalId; dto.createdAt = j.createdAt;
    dto.updatedAt = j.updatedAt; dto.deletedAt = j.deletedAt;
    return dto;
  }
}
