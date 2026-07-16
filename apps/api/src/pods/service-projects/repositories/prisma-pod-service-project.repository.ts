import { Injectable } from '@nestjs/common';
import { PodServiceProject, ServiceProjectStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateServiceProjectInput, IPodServiceProjectRepository } from './pod-service-project.repository.interface';

@Injectable()
export class PrismaPodServiceProjectRepository implements IPodServiceProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateServiceProjectInput): Promise<PodServiceProject> {
    return this.prisma.db.podServiceProject.create({ data });
  }

  async findById(id: string): Promise<PodServiceProject | null> {
    return this.prisma.db.podServiceProject.findUnique({ where: { id } });
  }

  async findForPod(podId: string): Promise<PodServiceProject[]> {
    return this.prisma.db.podServiceProject.findMany({ where: { podId }, orderBy: { createdAt: 'desc' } });
  }

  async update(id: string, data: { title?: string; description?: string; status?: ServiceProjectStatus }): Promise<PodServiceProject> {
    return this.prisma.db.podServiceProject.update({ where: { id }, data });
  }

  async countByPodAndStatus(podId: string, status: ServiceProjectStatus): Promise<number> {
    return this.prisma.db.podServiceProject.count({ where: { podId, status } });
  }

  async countForPod(podId: string): Promise<number> {
    return this.prisma.db.podServiceProject.count({ where: { podId } });
  }
}
