import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageReportStatus } from '@prisma/client';
import type { MessageReport } from '@prisma/client';

export class MessageReportResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() messageId: string;
  @ApiProperty() conversationId: string;
  @ApiProperty() reporterId: string;
  @ApiProperty() reason: string;
  @ApiProperty({ enum: MessageReportStatus }) status: MessageReportStatus;
  @ApiPropertyOptional({ nullable: true }) resolvedById: string | null;
  @ApiPropertyOptional({ nullable: true }) resolvedAt: Date | null;
  @ApiProperty() createdAt: Date;

  static fromEntity(r: MessageReport): MessageReportResponseDto {
    const dto = new MessageReportResponseDto();
    dto.id = r.id;
    dto.messageId = r.messageId;
    dto.conversationId = r.conversationId;
    dto.reporterId = r.reporterId;
    dto.reason = r.reason;
    dto.status = r.status;
    dto.resolvedById = r.resolvedById;
    dto.resolvedAt = r.resolvedAt;
    dto.createdAt = r.createdAt;
    return dto;
  }
}
