import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Module as ModuleModel } from '@prisma/client';

export class ModuleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() courseId: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() position: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(m: ModuleModel): ModuleResponseDto {
    const dto = new ModuleResponseDto();
    Object.assign(dto, m);
    return dto;
  }
}
