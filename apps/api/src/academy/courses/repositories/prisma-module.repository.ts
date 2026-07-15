import { Injectable } from '@nestjs/common';
import { Module as ModuleModel } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateModuleInput, IModuleRepository, UpdateModuleInput } from './module.repository.interface';

@Injectable()
export class PrismaModuleRepository implements IModuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateModuleInput): Promise<ModuleModel> {
    return this.prisma.db.module.create({ data });
  }

  async findById(id: string): Promise<ModuleModel | null> {
    return this.prisma.db.module.findUnique({ where: { id } });
  }

  async findByCourse(courseId: string): Promise<ModuleModel[]> {
    return this.prisma.db.module.findMany({ where: { courseId }, orderBy: { position: 'asc' } });
  }

  async countByCourse(courseId: string): Promise<number> {
    return this.prisma.db.module.count({ where: { courseId } });
  }

  async update(id: string, data: UpdateModuleInput): Promise<ModuleModel> {
    return this.prisma.db.module.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.db.module.delete({ where: { id } });
  }
}
