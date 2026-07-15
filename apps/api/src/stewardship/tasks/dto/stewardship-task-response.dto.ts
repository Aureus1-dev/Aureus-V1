import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StewardshipTaskStatus } from '@prisma/client';
import type { StewardshipTask } from '@prisma/client';

export class StewardshipTaskResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() relationshipId: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty({ enum: StewardshipTaskStatus }) status: StewardshipTaskStatus;
  @ApiPropertyOptional({ nullable: true }) dueDate: Date | null;
  @ApiProperty() createdById: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(t: StewardshipTask): StewardshipTaskResponseDto {
    const dto = new StewardshipTaskResponseDto();
    Object.assign(dto, t);
    return dto;
  }
}
