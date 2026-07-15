import { ApiProperty } from '@nestjs/swagger';
import { AiMessageRole } from '@prisma/client';
import type { AiMessage } from '@prisma/client';

export class MessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() conversationId: string;
  @ApiProperty({ enum: AiMessageRole }) role: AiMessageRole;
  @ApiProperty() content: string;
  @ApiProperty() createdAt: Date;

  static fromEntity(m: AiMessage): MessageResponseDto {
    const dto = new MessageResponseDto();
    Object.assign(dto, m);
    return dto;
  }
}
