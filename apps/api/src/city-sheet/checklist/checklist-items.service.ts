import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CitySheetCategory } from '@prisma/client';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { ChecklistItemResponseDto } from './dto/checklist-item-response.dto';
import {
  CHECKLIST_ITEM_REPOSITORY,
  IChecklistItemRepository,
} from './repositories/checklist-item.repository.interface';

/**
 * A4-PREP: the verification checklist is configuration-driven, not
 * hardcoded per category in application code, so Operations can add,
 * reorder, or retire items here without an engineering deploy.
 */
@Injectable()
export class ChecklistItemsService {
  constructor(
    @Inject(CHECKLIST_ITEM_REPOSITORY) private readonly repo: IChecklistItemRepository,
  ) {}

  async create(dto: CreateChecklistItemDto): Promise<ChecklistItemResponseDto> {
    const category = dto.category ?? null;
    const existing = await this.repo.findByLabel(category, dto.label);
    if (existing) {
      throw new ConflictException(
        `A checklist item with this label already exists for ${category ?? 'common (all categories)'}.`,
      );
    }

    const created = await this.repo.create(dto);
    return ChecklistItemResponseDto.fromEntity(created);
  }

  async findAll(category?: CitySheetCategory, includeInactive?: boolean): Promise<ChecklistItemResponseDto[]> {
    const items = await this.repo.findAll({ category, includeInactive });
    return items.map(ChecklistItemResponseDto.fromEntity);
  }

  /** All active common items plus this category's active items, combined — what a verification call for an entry of this category should actually ask. */
  async findApplicableForCategory(category: CitySheetCategory): Promise<ChecklistItemResponseDto[]> {
    const items = await this.repo.findApplicable(category);
    return items.map(ChecklistItemResponseDto.fromEntity);
  }

  async update(id: string, dto: UpdateChecklistItemDto): Promise<ChecklistItemResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Checklist item '${id}' not found`);

    const updated = await this.repo.update(id, dto);
    return ChecklistItemResponseDto.fromEntity(updated);
  }
}
