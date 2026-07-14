import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SavedResource } from '@prisma/client';

export class SavedResourceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() userId: string;
  @ApiProperty() resourceId: string;
  @ApiProperty() isFavorite: boolean;
  @ApiPropertyOptional({ nullable: true }) notes: string | null;
  @ApiProperty() savedAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(s: SavedResource): SavedResourceResponseDto {
    const dto = new SavedResourceResponseDto();
    Object.assign(dto, s);
    return dto;
  }
}
