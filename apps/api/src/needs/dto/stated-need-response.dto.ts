import { ApiProperty } from '@nestjs/swagger';
import type { StatedNeed } from '@prisma/client';

export class StatedNeedResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() conversationId: string;
  @ApiProperty() content: string;
  @ApiProperty() createdAt: Date;

  static fromEntity(entity: StatedNeed): StatedNeedResponseDto {
    const dto = new StatedNeedResponseDto();
    dto.id = entity.id;
    dto.conversationId = entity.conversationId;
    dto.content = entity.content;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
