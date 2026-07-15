import { StewardCapacity } from '@prisma/client';

export const STEWARD_CAPACITY_REPOSITORY = 'STEWARD_CAPACITY_REPOSITORY';

export interface IStewardCapacityRepository {
  /**
   * Returns the steward's capacity row, lazily creating one if absent. The
   * default ceiling is never hardcoded in application code — omitting
   * `maxActiveMembers` from the create payload lets Postgres apply the
   * schema-level `@default(25)` on `StewardCapacity`, the single source of
   * truth for the default.
   */
  findOrCreate(stewardId: string, updatedById: string): Promise<StewardCapacity>;
  update(stewardId: string, maxActiveMembers: number, updatedById: string): Promise<StewardCapacity>;
}
