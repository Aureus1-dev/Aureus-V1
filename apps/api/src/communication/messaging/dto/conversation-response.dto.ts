import { ApiProperty } from '@nestjs/swagger';
import { ConversationType } from '@prisma/client';
import type { Conversation } from '@prisma/client';

export class ConversationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ConversationType }) type: ConversationType;
  @ApiProperty({ required: false, nullable: true }) relationshipId: string | null;
  @ApiProperty({ required: false, nullable: true }) organizationId: string | null;
  @ApiProperty({ required: false, nullable: true }) lastMessageAt: Date | null;
  @ApiProperty() createdAt: Date;

  static fromEntity(c: Conversation): ConversationResponseDto {
    const dto = new ConversationResponseDto();
    dto.id = c.id;
    dto.type = c.type;
    dto.relationshipId = c.relationshipId;
    dto.organizationId = c.organizationId;
    dto.lastMessageAt = c.lastMessageAt;
    dto.createdAt = c.createdAt;
    return dto;
  }
}
