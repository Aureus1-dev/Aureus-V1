import { Injectable } from '@nestjs/common';
import { CitySheetCategory, CitySheetChecklistItem, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ChecklistItemQueryParams,
  CreateChecklistItemInput,
  IChecklistItemRepository,
  UpdateChecklistItemInput,
} from './checklist-item.repository.interface';

@Injectable()
export class PrismaChecklistItemRepository implements IChecklistItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateChecklistItemInput): Promise<CitySheetChecklistItem> {
    return this.prisma.db.citySheetChecklistItem.create({ data });
  }

  async findById(id: string): Promise<CitySheetChecklistItem | null> {
    return this.prisma.db.citySheetChecklistItem.findUnique({ where: { id } });
  }

  async findByLabel(category: CitySheetCategory | null, label: string): Promise<CitySheetChecklistItem | null> {
    return this.prisma.db.citySheetChecklistItem.findFirst({
      where: { category, label: { equals: label, mode: 'insensitive' } },
    });
  }

  async findApplicable(category: CitySheetCategory): Promise<CitySheetChecklistItem[]> {
    return this.prisma.db.citySheetChecklistItem.findMany({
      where: { isActive: true, OR: [{ category: null }, { category }] },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findAll(params: ChecklistItemQueryParams): Promise<CitySheetChecklistItem[]> {
    const where: Prisma.CitySheetChecklistItemWhereInput = {
      ...(params.category !== undefined && { category: params.category }),
      ...(!params.includeInactive && { isActive: true }),
    };
    return this.prisma.db.citySheetChecklistItem.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async update(id: string, data: UpdateChecklistItemInput): Promise<CitySheetChecklistItem> {
    return this.prisma.db.citySheetChecklistItem.update({ where: { id }, data });
  }
}
