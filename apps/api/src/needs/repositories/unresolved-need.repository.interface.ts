import { UnresolvedNeed } from '@prisma/client';

export const UNRESOLVED_NEED_REPOSITORY = 'UNRESOLVED_NEED_REPOSITORY';

export interface CreateUnresolvedNeedInput {
  userId: string;
  statedNeedId: string;
  reason: string;
  message: string;
}

export interface IUnresolvedNeedRepository {
  create(data: CreateUnresolvedNeedInput): Promise<UnresolvedNeed>;
  findByStatedNeed(statedNeedId: string): Promise<UnresolvedNeed | null>;
}
