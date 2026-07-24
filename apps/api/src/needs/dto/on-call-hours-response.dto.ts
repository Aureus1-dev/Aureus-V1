import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PublishedOnCallHours } from '@prisma/client';

export class OnCallHoursResponseDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Honest, human-readable description of the current on-call rotation. Null means not yet configured — never fabricated.',
  })
  hoursDescription: string | null;
  @ApiProperty() updatedAt: Date;

  static fromEntity(e: PublishedOnCallHours): OnCallHoursResponseDto {
    const dto = new OnCallHoursResponseDto();
    dto.hoursDescription = e.hoursDescription;
    dto.updatedAt = e.updatedAt;
    return dto;
  }
}
