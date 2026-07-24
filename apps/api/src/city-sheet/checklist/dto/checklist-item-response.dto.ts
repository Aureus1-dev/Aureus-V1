import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CitySheetCategory } from '@prisma/client';
import type { CitySheetChecklistItem } from '@prisma/client';

export class ChecklistItemResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ enum: CitySheetCategory, nullable: true, description: 'null = common item, applies to every category' })
  category: CitySheetCategory | null;
  @ApiProperty() label: string;
  @ApiProperty() sortOrder: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(e: CitySheetChecklistItem): ChecklistItemResponseDto {
    const dto = new ChecklistItemResponseDto();
    Object.assign(dto, e);
    return dto;
  }
}
