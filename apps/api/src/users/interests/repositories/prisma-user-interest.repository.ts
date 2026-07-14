import { Injectable } from '@nestjs/common';
import { OpportunityCategory, UserInterest } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IUserInterestRepository } from './user-interest.repository.interface';

@Injectable()
export class PrismaUserInterestRepository implements IUserInterestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, category: OpportunityCategory): Promise<UserInterest> {
    return this.prisma.db.userInterest.create({ data: { userId, category } });
  }

  async findByUser(userId: string): Promise<UserInterest[]> {
    return this.prisma.db.userInterest.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  async exists(userId: string, category: OpportunityCategory): Promise<boolean> {
    const count = await this.prisma.db.userInterest.count({ where: { userId, category } });
    return count > 0;
  }

  async remove(userId: string, category: OpportunityCategory): Promise<void> {
    await this.prisma.db.userInterest.deleteMany({ where: { userId, category } });
  }
}
