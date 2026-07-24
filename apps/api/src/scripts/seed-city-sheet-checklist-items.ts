import { CitySheetCategory } from '@prisma/client';
import { CITY_SHEET_CHECKLIST_ITEM_SEEDS } from './city-sheet-checklist-items.data';

/** The narrow slice of PrismaClient this seed needs — kept minimal so it can be exercised with a plain mock in tests, without a real database connection. */
export interface SeedChecklistItemsClient {
  citySheetChecklistItem: {
    findFirst(args: { where: Record<string, unknown> }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
}

export interface SeedChecklistItemsResult {
  created: string[];
  skippedExisting: string[];
}

/**
 * Loads the default A4-PREP verification checklist (common items + one
 * category's worth of specifics per LAUNCH-001 referral category) into
 * CitySheetChecklistItem. Idempotent: re-running skips any (category,
 * label) pair that already exists, so repeated `prisma db seed` runs never
 * create duplicates. This is only the starting configuration — Operations
 * can add, reorder, or retire items afterward via the checklist-items API
 * without touching this file again.
 */
export async function seedCitySheetChecklistItems(
  prisma: SeedChecklistItemsClient,
): Promise<SeedChecklistItemsResult> {
  const created: string[] = [];
  const skippedExisting: string[] = [];

  for (const item of CITY_SHEET_CHECKLIST_ITEM_SEEDS) {
    const category: CitySheetCategory | null = item.category ?? null;
    const key = `${category ?? 'common'}: ${item.label}`;

    const existing = await prisma.citySheetChecklistItem.findFirst({
      where: { category, label: { equals: item.label, mode: 'insensitive' } },
    });
    if (existing) {
      skippedExisting.push(key);
      continue;
    }

    await prisma.citySheetChecklistItem.create({
      data: { category, label: item.label, sortOrder: item.sortOrder },
    });
    created.push(key);
  }

  return { created, skippedExisting };
}
