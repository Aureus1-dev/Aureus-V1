import { Injectable } from '@nestjs/common';
import { Pod, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePodInput,
  IPodRepository,
  PaginatedPods,
  PodQueryParams,
  UpdatePodInput,
} from './pod.repository.interface';

@Injectable()
export class PrismaPodRepository implements IPodRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePodInput): Promise<Pod> {
    return this.prisma.db.pod.create({ data });
  }

  async setRef(id: string, podRef: string): Promise<Pod> {
    return this.prisma.db.pod.update({ where: { id }, data: { podRef } });
  }

  async findById(id: string): Promise<Pod | null> {
    return this.prisma.db.pod.findFirst({ where: { id, deletedAt: null } });
  }

  async findByRef(podRef: string): Promise<Pod | null> {
    return this.prisma.db.pod.findFirst({ where: { podRef, deletedAt: null } });
  }

  async findAll(params: PodQueryParams): Promise<PaginatedPods> {
    const { page, limit, q, type, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PodWhereInput = {
      deletedAt: null,
      ...(q && { OR: [{ name: { contains: q, mode: 'insensitive' } }, { shortDescription: { contains: q, mode: 'insensitive' } }] }),
      ...(type && { type }),
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.db.pod.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.db.pod.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async update(id: string, data: UpdatePodInput): Promise<Pod> {
    return this.prisma.db.pod.update({ where: { id }, data });
  }
}
