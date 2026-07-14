import { Injectable } from '@nestjs/common';
import { SavedResource } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateSavedResourceInput,
  ISavedResourceRepository,
  UpdateSavedResourceInput,
} from './saved-resource.repository.interface';

@Injectable()
export class PrismaSavedResourceRepository implements ISavedResourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(data: CreateSavedResourceInput): Promise<SavedResource> {
    return this.prisma.db.savedResource.create({ data });
  }

  async findByUser(userId: string): Promise<SavedResource[]> {
    return this.prisma.db.savedResource.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
    });
  }

  async findOne(userId: string, resourceId: string): Promise<SavedResource | null> {
    return this.prisma.db.savedResource.findUnique({
      where: { userId_resourceId: { userId, resourceId } },
    });
  }

  async update(
    userId: string, resourceId: string, data: UpdateSavedResourceInput,
  ): Promise<SavedResource> {
    return this.prisma.db.savedResource.update({
      where: { userId_resourceId: { userId, resourceId } },
      data,
    });
  }

  async remove(userId: string, resourceId: string): Promise<void> {
    await this.prisma.db.savedResource.delete({
      where: { userId_resourceId: { userId, resourceId } },
    });
  }
}
