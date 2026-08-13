import { ApiProperty } from '@nestjs/swagger';
import { MessageStatus } from '@prisma/client';
import type { Message } from '@prisma/client';

export class MessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() conversationId: string;
  @ApiProperty() senderId: string;
  @ApiProperty() body: string;
  @ApiProperty({ enum: MessageStatus }) status: MessageStatus;
  @ApiProperty() createdAt: Date;
  @ApiProperty({ description: 'PD-008 — true once removed (own delete or steward/admin moderation). Deleted messages are never returned by list endpoints.' })
  deleted: boolean;

  static fromEntity(m: Message): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = m.id;
    dto.conversationId = m.conversationId;
    dto.senderId = m.senderId;
    dto.body = m.body;
    dto.status = m.status;
    dto.createdAt = m.createdAt;
    dto.deleted = m.deletedAt != null;
    return dto;
  }
}
