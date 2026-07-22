import { seedCitySheetChecklistItems, SeedChecklistItemsClient } from './seed-city-sheet-checklist-items';
import { CITY_SHEET_CHECKLIST_ITEM_SEEDS } from './city-sheet-checklist-items.data';

function makeClient(overrides: Partial<{
  findFirst: jest.Mock;
  create: jest.Mock;
}> = {}): SeedChecklistItemsClient {
  return {
    citySheetChecklistItem: {
      findFirst: overrides.findFirst ?? jest.fn().mockResolvedValue(null),
      create: overrides.create ?? jest.fn().mockResolvedValue({ id: 'item-x' }),
    },
  };
}

describe('seedCitySheetChecklistItems', () => {
  it('creates every seed item exactly once when none exist', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'item-x' });
    const client = makeClient({ create });

    const result = await seedCitySheetChecklistItems(client);

    expect(create).toHaveBeenCalledTimes(CITY_SHEET_CHECKLIST_ITEM_SEEDS.length);
    expect(result.created).toHaveLength(CITY_SHEET_CHECKLIST_ITEM_SEEDS.length);
    expect(result.skippedExisting).toHaveLength(0);
  });

  it('is idempotent: skips items whose (category, label) already exists', async () => {
    const alreadySeeded = new Set(
      CITY_SHEET_CHECKLIST_ITEM_SEEDS.map((i) => `${i.category ?? 'common'}: ${i.label}`),
    );
    const findFirst = jest.fn().mockImplementation(async ({ where }) => {
      const key = `${where.category ?? 'common'}: ${where.label.equals}`;
      return alreadySeeded.has(key) ? { id: 'existing' } : null;
    });
    const create = jest.fn();
    const client = makeClient({ findFirst, create });

    const result = await seedCitySheetChecklistItems(client);

    expect(create).not.toHaveBeenCalled();
    expect(result.created).toHaveLength(0);
    expect(result.skippedExisting).toHaveLength(CITY_SHEET_CHECKLIST_ITEM_SEEDS.length);
  });

  it('common items (no category) are created with category null', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'item-x' });
    const client = makeClient({ create });

    await seedCitySheetChecklistItems(client);

    const commonSeeds = CITY_SHEET_CHECKLIST_ITEM_SEEDS.filter((i) => !i.category);
    const commonCalls = create.mock.calls.filter((c) => c[0].data.category === null);
    expect(commonCalls).toHaveLength(commonSeeds.length);
  });

  it('no two seed items share the same (category, label) pair', () => {
    const keys = CITY_SHEET_CHECKLIST_ITEM_SEEDS.map((i) => `${i.category ?? 'common'}: ${i.label}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
