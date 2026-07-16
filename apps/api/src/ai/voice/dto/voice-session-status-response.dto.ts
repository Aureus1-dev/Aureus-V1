import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VoiceSessionEndReason } from '@prisma/client';
import type { AiVoiceSession } from '@prisma/client';

export class VoiceSessionStatusResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() conversationId: string;
  @ApiProperty() startedAt: Date;
  @ApiPropertyOptional({ nullable: true }) endedAt: Date | null;
  @ApiPropertyOptional({ enum: VoiceSessionEndReason, nullable: true }) endReason: VoiceSessionEndReason | null;

  static fromEntity(session: AiVoiceSession): VoiceSessionStatusResponseDto {
    const dto = new VoiceSessionStatusResponseDto();
    dto.id = session.id;
    dto.conversationId = session.conversationId;
    dto.startedAt = session.startedAt;
    dto.endedAt = session.endedAt;
    dto.endReason = session.endReason;
    return dto;
  }
}
