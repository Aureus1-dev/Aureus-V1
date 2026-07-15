import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiCapability, AiProvider, AiRequestStatus } from '@prisma/client';
import type { AiRequest } from '@prisma/client';

export class AiRequestResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiPropertyOptional({ nullable: true }) conversationId: string | null;
  @ApiProperty({ enum: AiCapability }) capability: AiCapability;
  @ApiProperty({ enum: AiProvider }) provider: AiProvider;
  @ApiProperty() model: string;
  @ApiProperty() promptTokens: number;
  @ApiProperty() completionTokens: number;
  @ApiProperty() costUsd: number;
  @ApiProperty() latencyMs: number;
  @ApiProperty({ enum: AiRequestStatus }) status: AiRequestStatus;
  @ApiPropertyOptional({ nullable: true }) errorMessage: string | null;
  @ApiProperty() createdAt: Date;

  static fromEntity(r: AiRequest): AiRequestResponseDto {
    const dto = new AiRequestResponseDto();
    Object.assign(dto, r);
    return dto;
  }
}
