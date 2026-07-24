import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateChecklistItemDto } from './create-checklist-item.dto';

export class UpdateChecklistItemDto extends PartialType(CreateChecklistItemDto) {
  @ApiPropertyOptional({ description: 'Retire an item without deleting it — preserves it for any historical verification events that reference its label' })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
