import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoalStatus } from '@prisma/client';
import type { Goal } from '@prisma/client';

export class GoalResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty({ enum: GoalStatus }) status: GoalStatus;
  @ApiProperty() userId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ nullable: true }) deletedAt: Date | null;

  static fromEntity(g: Goal): GoalResponseDto {
    const dto = new GoalResponseDto();
    dto.id = g.id; dto.title = g.title; dto.status = g.status;
    dto.userId = g.userId; dto.createdAt = g.createdAt;
    dto.updatedAt = g.updatedAt; dto.deletedAt = g.deletedAt;
    return dto;
  }
}
