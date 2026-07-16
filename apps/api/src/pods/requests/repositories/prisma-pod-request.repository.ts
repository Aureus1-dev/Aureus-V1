import { Injectable } from '@nestjs/common';
import { Prisma, PodRequest } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateRequestInput,
  IPodRequestRepository,
  PaginatedRequests,
  RequestQueryParams,
  UpdateRequestInput,
} from './pod-request.repository.interface';

@Injectable()
export class PrismaPodRequestRepository implements IPodRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRequestInput): Promise<PodRequest> {
    return this.prisma.db.podRequest.create({ data });
  }

  async findById(id: string): Promise<PodRequest | null> {
    return this.prisma.db.podRequest.findUnique({ where: { id } });
  }

  async findAll(params: RequestQueryParams): Promise<PaginatedRequests> {
    const { page, limit, userId, podId, status } = params;
    const skip = (page - 1) * limit;
    const where: Prisma.PodRequestWhereInput = {
      ...(userId && { userId }),
      ...(podId && { podId }),
      ...(status && { status }),
    };
    const [data, total] = await Promise.all([
      this.prisma.db.podRequest.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.db.podRequest.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async update(id: string, data: UpdateRequestInput): Promise<PodRequest> {
    return this.prisma.db.podRequest.update({ where: { id }, data });
  }
}
