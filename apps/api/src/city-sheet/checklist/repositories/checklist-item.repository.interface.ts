import { CitySheetCategory, CitySheetChecklistItem } from '@prisma/client';

export const CHECKLIST_ITEM_REPOSITORY = 'CHECKLIST_ITEM_REPOSITORY';

export interface CreateChecklistItemInput {
  category?: CitySheetCategory;
  label: string;
  sortOrder?: number;
}

export interface UpdateChecklistItemInput {
  category?: CitySheetCategory | null;
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ChecklistItemQueryParams {
  category?: CitySheetCategory;
  includeInactive?: boolean;
}

export interface IChecklistItemRepository {
  create(data: CreateChecklistItemInput): Promise<CitySheetChecklistItem>;
  findById(id: string): Promise<CitySheetChecklistItem | null>;
  findByLabel(category: CitySheetCategory | null, label: string): Promise<CitySheetChecklistItem | null>;
  /** All active common items (category null) plus, when a category is given, all active items scoped to it — ordered by sortOrder. */
  findApplicable(category: CitySheetCategory): Promise<CitySheetChecklistItem[]>;
  findAll(params: ChecklistItemQueryParams): Promise<CitySheetChecklistItem[]>;
  update(id: string, data: UpdateChecklistItemInput): Promise<CitySheetChecklistItem>;
}
