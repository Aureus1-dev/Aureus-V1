import { Injectable } from '@nestjs/common';
import { Profile } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateProfileInput,
  IProfileRepository,
  UpdateProfileInput,
} from './profile.repository.interface';

@Injectable()
export class PrismaProfileRepository implements IProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProfileInput): Promise<Profile> {
    return this.prisma.db.profile.create({ data });
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    return this.prisma.db.profile.findFirst({ where: { userId, deletedAt: null } });
  }

  async update(userId: string, data: UpdateProfileInput): Promise<Profile> {
    return this.prisma.db.profile.update({ where: { userId }, data });
  }

  async softDelete(userId: string): Promise<Profile> {
    return this.prisma.db.profile.update({ where: { userId }, data: { deletedAt: new Date() } });
  }
}
