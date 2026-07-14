import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MilestoneStatus } from '@prisma/client';
import type { Milestone } from '@prisma/client';

export class MilestoneResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty({ enum: MilestoneStatus }) status: MilestoneStatus;
  @ApiProperty() position: number;
  @ApiProperty() journeyId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ nullable: true }) deletedAt: Date | null;

  static fromEntity(m: Milestone): MilestoneResponseDto {
    const dto = new MilestoneResponseDto();
    dto.id = m.id; dto.title = m.title; dto.status = m.status;
    dto.position = m.position; dto.journeyId = m.journeyId;
    dto.createdAt = m.createdAt; dto.updatedAt = m.updatedAt; dto.deletedAt = m.deletedAt;
    return dto;
  }
}
