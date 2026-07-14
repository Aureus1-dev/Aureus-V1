import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@prisma/client';
import type { Task } from '@prisma/client';

export class TaskResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty({ enum: TaskStatus }) status: TaskStatus;
  @ApiProperty({ enum: TaskPriority }) priority: TaskPriority;
  @ApiProperty() position: number;
  @ApiProperty() milestoneId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional({ nullable: true }) deletedAt: Date | null;

  static fromEntity(t: Task): TaskResponseDto {
    const dto = new TaskResponseDto();
    dto.id = t.id; dto.title = t.title; dto.status = t.status;
    dto.priority = t.priority; dto.position = t.position;
    dto.milestoneId = t.milestoneId; dto.createdAt = t.createdAt;
    dto.updatedAt = t.updatedAt; dto.deletedAt = t.deletedAt;
    return dto;
  }
}
