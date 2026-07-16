import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AiVoiceSession } from '@prisma/client';

/**
 * clientSecret is returned exactly once, at session creation — it is never
 * persisted in plaintext readable form beyond this response and is never
 * re-issued by any other endpoint (Founder Decision 5: "narrowly scoped,
 * revocable" session credentials).
 */
export class VoiceSessionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() conversationId: string;
  @ApiProperty() clientSecret: string;
  @ApiProperty() expiresAt: Date;
  @ApiProperty() model: string;
  @ApiProperty() voice: string;
  @ApiProperty() turnDetectionMode: string;
  @ApiProperty() startedAt: Date;
  @ApiPropertyOptional({ nullable: true }) endedAt: Date | null;

  static fromEntity(session: AiVoiceSession, clientSecret: string, expiresAt: Date): VoiceSessionResponseDto {
    const dto = new VoiceSessionResponseDto();
    dto.id = session.id;
    dto.conversationId = session.conversationId;
    dto.clientSecret = clientSecret;
    dto.expiresAt = expiresAt;
    dto.model = session.model;
    dto.voice = session.voice;
    dto.turnDetectionMode = session.turnDetectionMode;
    dto.startedAt = session.startedAt;
    dto.endedAt = session.endedAt;
    return dto;
  }
}
