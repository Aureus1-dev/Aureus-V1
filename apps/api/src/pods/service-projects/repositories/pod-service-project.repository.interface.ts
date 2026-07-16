import { PodServiceProject, ServiceProjectStatus } from '@prisma/client';

export const POD_SERVICE_PROJECT_REPOSITORY = 'POD_SERVICE_PROJECT_REPOSITORY';

export interface CreateServiceProjectInput {
  podId: string;
  title: string;
  description: string;
  proposedById: string;
}

export interface IPodServiceProjectRepository {
  create(data: CreateServiceProjectInput): Promise<PodServiceProject>;
  findById(id: string): Promise<PodServiceProject | null>;
  findForPod(podId: string): Promise<PodServiceProject[]>;
  update(id: string, data: { title?: string; description?: string; status?: ServiceProjectStatus }): Promise<PodServiceProject>;
  countByPodAndStatus(podId: string, status: ServiceProjectStatus): Promise<number>;
  countForPod(podId: string): Promise<number>;
}
