import { Injectable } from '@nestjs/common';
import { Lesson } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLessonInput, ILessonRepository, UpdateLessonInput } from './lesson.repository.interface';

@Injectable()
export class PrismaLessonRepository implements ILessonRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLessonInput): Promise<Lesson> {
    return this.prisma.db.lesson.create({ data });
  }

  async findById(id: string): Promise<Lesson | null> {
    return this.prisma.db.lesson.findUnique({ where: { id } });
  }

  async findByModule(moduleId: string): Promise<Lesson[]> {
    return this.prisma.db.lesson.findMany({ where: { moduleId }, orderBy: { position: 'asc' } });
  }

  async findByCourse(courseId: string): Promise<Lesson[]> {
    return this.prisma.db.lesson.findMany({
      where: { module: { courseId } },
      orderBy: [{ module: { position: 'asc' } }, { position: 'asc' }],
    });
  }

  async countByModule(moduleId: string): Promise<number> {
    return this.prisma.db.lesson.count({ where: { moduleId } });
  }

  async update(id: string, data: UpdateLessonInput): Promise<Lesson> {
    return this.prisma.db.lesson.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.db.lesson.delete({ where: { id } });
  }
}
