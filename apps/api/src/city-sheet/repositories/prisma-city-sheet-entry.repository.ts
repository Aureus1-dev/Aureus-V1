import { Injectable } from '@nestjs/common';
import { CitySheetEntry, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CitySheetEntryQueryParams,
  CreateCitySheetEntryInput,
  ICitySheetEntryRepository,
  PaginatedCitySheetEntries,
  UpdateCitySheetEntryInput,
} from './city-sheet-entry.repository.interface';

@Injectable()
export class PrismaCitySheetEntryRepository implements ICitySheetEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCitySheetEntryInput): Promise<CitySheetEntry> {
    return this.prisma.db.citySheetEntry.create({ data });
  }

  async setRef(id: string, citySheetRef: string): Promise<CitySheetEntry> {
    return this.prisma.db.citySheetEntry.update({ where: { id }, data: { citySheetRef } });
  }

  async findById(id: string): Promise<CitySheetEntry | null> {
    return this.prisma.db.citySheetEntry.findUnique({ where: { id } });
  }

  async findByRef(citySheetRef: string): Promise<CitySheetEntry | null> {
    return this.prisma.db.citySheetEntry.findUnique({ where: { citySheetRef } });
  }

  async findAll(params: CitySheetEntryQueryParams): Promise<PaginatedCitySheetEntries> {
    const { page, limit, q, category, launchScope, verificationStatus, status } = params;
    const skip = (page - 1) * limit;

    const searchClauses: Prisma.CitySheetEntryWhereInput[] = q
      ? [
          { organizationName: { contains: q, mode: 'insensitive' } },
          { description:      { contains: q, mode: 'insensitive' } },
          { serviceArea:      { contains: q, mode: 'insensitive' } },
        ]
      : [];

    const where: Prisma.CitySheetEntryWhereInput = {
      ...(searchClauses.length && { OR: searchClauses }),
      ...(category            && { category }),
      ...(launchScope         && { launchScope }),
      ...(verificationStatus  && { verificationStatus }),
      ...(status              && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.db.citySheetEntry.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.db.citySheetEntry.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(id: string, data: UpdateCitySheetEntryInput): Promise<CitySheetEntry> {
    return this.prisma.db.citySheetEntry.update({ where: { id }, data });
  }
}
