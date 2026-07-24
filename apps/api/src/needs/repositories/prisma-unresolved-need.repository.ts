import { Injectable } from '@nestjs/common';
import { UnresolvedNeed } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateUnresolvedNeedInput,
  IUnresolvedNeedRepository,
} from './unresolved-need.repository.interface';

@Injectable()
export class PrismaUnresolvedNeedRepository implements IUnresolvedNeedRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUnresolvedNeedInput): Promise<UnresolvedNeed> {
    return this.prisma.db.unresolvedNeed.create({ data });
  }

  async findByStatedNeed(statedNeedId: string): Promise<UnresolvedNeed | null> {
    return this.prisma.db.unresolvedNeed.findUnique({ where: { statedNeedId } });
  }
}
