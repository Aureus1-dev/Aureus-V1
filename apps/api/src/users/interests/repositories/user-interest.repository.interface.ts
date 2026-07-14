import { OpportunityCategory, UserInterest } from '@prisma/client';

export const USER_INTEREST_REPOSITORY = 'USER_INTEREST_REPOSITORY';

export interface IUserInterestRepository {
  add(userId: string, category: OpportunityCategory): Promise<UserInterest>;
  findByUser(userId: string): Promise<UserInterest[]>;
  remove(userId: string, category: OpportunityCategory): Promise<void>;
  exists(userId: string, category: OpportunityCategory): Promise<boolean>;
}
