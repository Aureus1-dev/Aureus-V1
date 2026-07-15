import { Injectable } from '@nestjs/common';
import { MediaAsset, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateMediaAssetInput,
  IMediaAssetRepository,
  MediaAssetQueryParams,
  PaginatedMediaAssets,
  UpdateMediaAssetInput,
} from './media-asset.repository.interface';

@Injectable()
export class PrismaMediaAssetRepository implements IMediaAssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMediaAssetInput): Promise<MediaAsset> {
    return this.prisma.db.mediaAsset.create({ data });
  }

  async setRef(id: string, mediaRef: string): Promise<MediaAsset> {
    return this.prisma.db.mediaAsset.update({ where: { id }, data: { mediaRef } });
  }

  async findById(id: string): Promise<MediaAsset | null> {
    return this.prisma.db.mediaAsset.findFirst({ where: { id, deletedAt: null } });
  }

  async findByRef(mediaRef: string): Promise<MediaAsset | null> {
    return this.prisma.db.mediaAsset.findFirst({ where: { mediaRef, deletedAt: null } });
  }

  async findAll(params: MediaAssetQueryParams): Promise<PaginatedMediaAssets> {
    const { page, limit, q, type, uploadedById } = params;
    const skip = (page - 1) * limit;

    const searchClauses: Prisma.MediaAssetWhereInput[] = q
      ? [
          { title:       { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ]
      : [];

    const where: Prisma.MediaAssetWhereInput = {
      deletedAt: null,
      ...(searchClauses.length && { OR: searchClauses }),
      ...(type          && { type }),
      ...(uploadedById  && { uploadedById }),
    };

    const [data, total] = await Promise.all([
      this.prisma.db.mediaAsset.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.db.mediaAsset.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(id: string, data: UpdateMediaAssetInput): Promise<MediaAsset> {
    return this.prisma.db.mediaAsset.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<MediaAsset> {
    return this.prisma.db.mediaAsset.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
