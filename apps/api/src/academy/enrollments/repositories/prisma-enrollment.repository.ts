import { Injectable } from '@nestjs/common';
import { Enrollment } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateEnrollmentInput,
  IEnrollmentRepository,
  UpdateEnrollmentInput,
} from './enrollment.repository.interface';

@Injectable()
export class PrismaEnrollmentRepository implements IEnrollmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEnrollmentInput): Promise<Enrollment> {
    return this.prisma.db.enrollment.create({ data });
  }

  async findById(id: string): Promise<Enrollment | null> {
    return this.prisma.db.enrollment.findUnique({ where: { id } });
  }

  async findByUserAndCourse(userId: string, courseId: string): Promise<Enrollment | null> {
    return this.prisma.db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  }

  async findByUser(userId: string): Promise<Enrollment[]> {
    return this.prisma.db.enrollment.findMany({ where: { userId }, orderBy: { enrolledAt: 'desc' } });
  }

  async update(id: string, data: UpdateEnrollmentInput): Promise<Enrollment> {
    return this.prisma.db.enrollment.update({ where: { id }, data });
  }
}
