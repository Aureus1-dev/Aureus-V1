import { StatedNeed } from '@prisma/client';

export const STATED_NEED_REPOSITORY = 'STATED_NEED_REPOSITORY';

export interface CreateStatedNeedInput {
  userId: string;
  conversationId: string;
  content: string;
}

export interface IStatedNeedRepository {
  create(data: CreateStatedNeedInput): Promise<StatedNeed>;
  findAllByUser(userId: string): Promise<StatedNeed[]>;
  findById(id: string): Promise<StatedNeed | null>;
}
