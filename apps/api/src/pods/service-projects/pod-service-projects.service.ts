import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PodAuthorizationService } from '../common/pod-authorization.service';
import { CreateServiceProjectDto, ServiceProjectResponseDto, UpdateServiceProjectDto, UpdateServiceProjectStatusDto } from './dto/service-project.dto';
import { IPodServiceProjectRepository, POD_SERVICE_PROJECT_REPOSITORY } from './repositories/pod-service-project.repository.interface';

/** Article IX's "who needs us?" — any active Pod member may propose; the Steward manages status. */
@Injectable()
export class PodServiceProjectsService {
  constructor(
    @Inject(POD_SERVICE_PROJECT_REPOSITORY) private readonly repo: IPodServiceProjectRepository,
    private readonly auth: PodAuthorizationService,
  ) {}

  async create(podId: string, dto: CreateServiceProjectDto, caller: AuthenticatedUser): Promise<ServiceProjectResponseDto> {
    await this.auth.assertActiveMemberOrAdmin(podId, caller);
    const project = await this.repo.create({ podId, ...dto, proposedById: caller.id });
    return ServiceProjectResponseDto.fromEntity(project);
  }

  async findForPod(podId: string): Promise<ServiceProjectResponseDto[]> {
    const projects = await this.repo.findForPod(podId);
    return projects.map(ServiceProjectResponseDto.fromEntity);
  }

  async update(id: string, dto: UpdateServiceProjectDto, caller: AuthenticatedUser): Promise<ServiceProjectResponseDto> {
    const project = await this.getOrThrow(id);
    if (project.proposedById !== caller.id) await this.auth.assertStewardOrAdmin(project.podId, caller);
    const updated = await this.repo.update(id, dto);
    return ServiceProjectResponseDto.fromEntity(updated);
  }

  async updateStatus(id: string, dto: UpdateServiceProjectStatusDto, caller: AuthenticatedUser): Promise<ServiceProjectResponseDto> {
    const project = await this.getOrThrow(id);
    await this.auth.assertStewardOrAdmin(project.podId, caller);
    const updated = await this.repo.update(id, { status: dto.status });
    return ServiceProjectResponseDto.fromEntity(updated);
  }

  private async getOrThrow(id: string) {
    const project = await this.repo.findById(id);
    if (!project) throw new NotFoundException(`Pod service project '${id}' not found`);
    return project;
  }
}
