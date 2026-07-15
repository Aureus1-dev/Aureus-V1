import { Injectable } from '@nestjs/common';
import { Certification } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateCertificationInput,
  ICertificationRepository,
} from './certification.repository.interface';

@Injectable()
export class PrismaCertificationRepository implements ICertificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCertificationInput): Promise<Certification> {
    return this.prisma.db.certification.create({ data });
  }

  async setRef(id: string, certificateRef: string): Promise<Certification> {
    return this.prisma.db.certification.update({ where: { id }, data: { certificateRef } });
  }

  async findById(id: string): Promise<Certification | null> {
    return this.prisma.db.certification.findUnique({ where: { id } });
  }

  async findByUserAndCourse(userId: string, courseId: string): Promise<Certification | null> {
    return this.prisma.db.certification.findUnique({ where: { userId_courseId: { userId, courseId } } });
  }

  async findByUser(userId: string): Promise<Certification[]> {
    return this.prisma.db.certification.findMany({ where: { userId }, orderBy: { issuedAt: 'desc' } });
  }
}
