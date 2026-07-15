import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StewardshipEscalationSeverity, StewardshipEscalationStatus } from '@prisma/client';
import type { StewardshipEscalation } from '@prisma/client';

export class EscalationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() relationshipId: string;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty({ enum: StewardshipEscalationSeverity }) severity: StewardshipEscalationSeverity;
  @ApiProperty({ enum: StewardshipEscalationStatus }) status: StewardshipEscalationStatus;
  @ApiProperty() raisedById: string;
  @ApiPropertyOptional({ nullable: true }) resolvedById: string | null;
  @ApiPropertyOptional({ nullable: true }) resolutionNotes: string | null;
  @ApiProperty() createdAt: Date;
  @ApiPropertyOptional({ nullable: true }) resolvedAt: Date | null;

  static fromEntity(e: StewardshipEscalation): EscalationResponseDto {
    const dto = new EscalationResponseDto();
    Object.assign(dto, e);
    return dto;
  }
}
