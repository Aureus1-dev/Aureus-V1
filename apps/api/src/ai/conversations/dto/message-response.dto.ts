import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiMessageCompletionStatus, AiMessageRole } from '@prisma/client';
import type { AiMessage } from '@prisma/client';

export class ToolCallResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ description: 'JSON-encoded arguments, e.g. \'{"route":"journey"}\'.' }) arguments: string;
}

export class MessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() conversationId: string;
  @ApiProperty({ enum: AiMessageRole }) role: AiMessageRole;
  @ApiProperty() content: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ enum: AiMessageCompletionStatus }) completionStatus: AiMessageCompletionStatus;
  @ApiPropertyOptional({ nullable: true, description: 'Set when this message was produced in a voice session' }) voiceSessionId: string | null;
  @ApiPropertyOptional({
    type: [ToolCallResponseDto],
    description:
      'Present only when the steward requested one or more interface actions in this response (DOMAIN-007). Ephemeral — reflects this response only, never persisted or replayed from history.',
  })
  toolCalls?: ToolCallResponseDto[];

  static fromEntity(m: AiMessage): MessageResponseDto {
    const dto = new MessageResponseDto();
    Object.assign(dto, m);
    return dto;
  }
}
