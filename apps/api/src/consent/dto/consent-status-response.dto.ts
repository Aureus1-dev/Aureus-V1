import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ConsentRecord } from '@prisma/client';
import { CURRENT_CONSENT_VERSION } from '../consent.constants';

export class ConsentStatusResponseDto {
  @ApiProperty() granted: boolean;
  @ApiProperty({ description: 'Whether the latest grant matches CURRENT_CONSENT_VERSION.' }) isCurrentVersion: boolean;
  @ApiPropertyOptional({ nullable: true }) version: string | null;
  @ApiPropertyOptional({ nullable: true }) grantedAt: Date | null;

  static fromLatest(record: ConsentRecord | null): ConsentStatusResponseDto {
    const dto = new ConsentStatusResponseDto();
    dto.granted = record !== null;
    dto.isCurrentVersion = record?.version === CURRENT_CONSENT_VERSION;
    dto.version = record?.version ?? null;
    dto.grantedAt = record?.grantedAt ?? null;
    return dto;
  }
}
