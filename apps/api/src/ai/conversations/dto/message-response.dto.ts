import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiMessageCompletionStatus, AiMessageRole } from '@prisma/client';
import type { AiMessage } from '@prisma/client';

export class MessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() conversationId: string;
  @ApiProperty({ enum: AiMessageRole }) role: AiMessageRole;
  @ApiProperty() content: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ enum: AiMessageCompletionStatus }) completionStatus: AiMessageCompletionStatus;
  @ApiPropertyOptional({ nullable: true, description: 'Set when this message was produced in a voice session' }) voiceSessionId: string | null;

  static fromEntity(m: AiMessage): MessageResponseDto {
    const dto = new MessageResponseDto();
    Object.assign(dto, m);
    return dto;
  }
}
