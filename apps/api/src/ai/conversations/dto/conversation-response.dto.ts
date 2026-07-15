import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AiConversation } from '@prisma/client';

export class ConversationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiPropertyOptional({ nullable: true }) title: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(c: AiConversation): ConversationResponseDto {
    const dto = new ConversationResponseDto();
    Object.assign(dto, c);
    return dto;
  }
}
