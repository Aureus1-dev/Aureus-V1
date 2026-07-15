import { Injectable } from '@nestjs/common';
import { StewardCapacity } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IStewardCapacityRepository } from './steward-capacity.repository.interface';

@Injectable()
export class PrismaStewardCapacityRepository implements IStewardCapacityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(stewardId: string, updatedById: string): Promise<StewardCapacity> {
    return this.prisma.db.stewardCapacity.upsert({
      where: { stewardId },
      update: {},
      // maxActiveMembers intentionally omitted — Postgres applies the
      // schema-level @default(25) so the default lives in exactly one place.
      create: { stewardId, updatedById },
    });
  }

  async update(stewardId: string, maxActiveMembers: number, updatedById: string): Promise<StewardCapacity> {
    return this.prisma.db.stewardCapacity.upsert({
      where: { stewardId },
      update: { maxActiveMembers, updatedById },
      create: { stewardId, maxActiveMembers, updatedById },
    });
  }
}
