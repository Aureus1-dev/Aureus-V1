import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IUserRepository,
  CreateUserInput,
  UpdateUserInput,
  PaginationParams,
  PaginatedResult,
} from './user.repository.interface';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserInput): Promise<User> {
    return this.prisma.db.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.db.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.db.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    return this.prisma.db.user.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<User> {
    return this.prisma.db.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findAll({ page, limit, status, role }: PaginationParams): Promise<PaginatedResult<User>> {
    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
      ...(status !== undefined && { status }),
      ...(role !== undefined && { roles: { has: role } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.db.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
