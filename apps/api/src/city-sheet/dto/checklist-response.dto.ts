import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * A single checklist item's outcome, recorded on a verification event.
 * `label` is a snapshot of the CitySheetChecklistItem's text at the time of
 * the call — stored alongside `itemId` (not looked up fresh each time) so
 * this response reads correctly in history even if the item is later
 * edited or retired (A4-PREP: configuration-driven checklist).
 */
export class ChecklistResponseDto {
  @ApiProperty({ description: 'CitySheetChecklistItem id this response answers' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ description: "Snapshot of the item's label at the time of this response" })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Whether the steward confirmed this item on the call' })
  @IsBoolean()
  confirmed: boolean;

  @ApiPropertyOptional({ example: 'Confirmed by the office manager, Jane.' })
  @IsOptional() @IsString()
  note?: string;
}
