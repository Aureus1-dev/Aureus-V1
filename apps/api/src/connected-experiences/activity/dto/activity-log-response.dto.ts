import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StewardActivityActor, StewardActivityEventType } from '@prisma/client';
import type { StewardActivityLog } from '@prisma/client';

export class ActivityLogResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty({ enum: StewardActivityEventType }) eventType: StewardActivityEventType;
  @ApiProperty({ enum: StewardActivityActor }) actor: StewardActivityActor;
  @ApiProperty() description: string;
  @ApiPropertyOptional({ nullable: true }) connectedAccountId: string | null;
  @ApiPropertyOptional({ nullable: true }) documentId: string | null;
  @ApiProperty() occurredAt: Date;

  static fromEntity(log: StewardActivityLog): ActivityLogResponseDto {
    const dto = new ActivityLogResponseDto();
    Object.assign(dto, log);
    return dto;
  }
}
