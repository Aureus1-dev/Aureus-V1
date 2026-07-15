import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '@prisma/client';
import type { MediaAsset } from '@prisma/client';

export class MediaAssetResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'Stable human-readable ID, e.g. AUR-MED-000001', nullable: true })
  mediaRef: string | null;
  @ApiProperty({ enum: MediaType }) type: MediaType;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty() storageRef: string;
  @ApiPropertyOptional({ nullable: true }) mimeType: string | null;
  @ApiPropertyOptional({ nullable: true }) sizeBytes: number | null;
  @ApiPropertyOptional({ nullable: true }) durationSeconds: number | null;
  @ApiProperty() uploadedById: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(m: MediaAsset): MediaAssetResponseDto {
    const dto = new MediaAssetResponseDto();
    Object.assign(dto, m);
    return dto;
  }
}
