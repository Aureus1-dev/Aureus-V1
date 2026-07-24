import { PublishedOnCallHours } from '@prisma/client';

export const ON_CALL_HOURS_REPOSITORY = 'ON_CALL_HOURS_REPOSITORY';

export interface UpdateOnCallHoursInput {
  hoursDescription: string;
  updatedById: string;
}

export interface IOnCallHoursRepository {
  /** Returns the singleton row, creating it (hoursDescription: null — honestly "not yet configured") the first time it's read. */
  getOrCreate(): Promise<PublishedOnCallHours>;
  update(data: UpdateOnCallHoursInput): Promise<PublishedOnCallHours>;
}
