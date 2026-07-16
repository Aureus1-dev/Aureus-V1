import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PodStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreatePodDto } from './dto/create-pod.dto';
import { UpdatePodDto } from './dto/update-pod.dto';
import { ListPodsQueryDto } from './dto/list-pods-query.dto';
import { PodResponseDto } from './dto/pod-response.dto';
import { PaginatedPodsResponseDto } from './dto/paginated-pods-response.dto';
import { IPodRepository, POD_REPOSITORY } from './repositories/pod.repository.interface';
import { PodAuthorizationService } from './common/pod-authorization.service';

@Injectable()
export class PodsService {
  private readonly logger = new Logger(PodsService.name);

  constructor(
    @Inject(POD_REPOSITORY) private readonly repo: IPodRepository,
    private readonly auth: PodAuthorizationService,
  ) {}

  /** Direct creation (Steward/Admin). A PROPOSE_NEW_POD PodRequest approval creates a Pod through PodRequestsService instead. */
  async create(dto: CreatePodDto, caller: AuthenticatedUser): Promise<PodResponseDto> {
    if (dto.parentPodId) await this.getOrThrow(dto.parentPodId);

    const pod = await this.repo.create({ ...dto, createdById: caller.id });
    const podRef = `AUR-POD-${pod.sequenceNumber.toString().padStart(6, '0')}`;
    const updated = await this.repo.setRef(pod.id, podRef);

    this.logger.log(`Pod created: ${podRef} by ${caller.id}`);
    return PodResponseDto.fromEntity(updated);
  }

  async findAll(query: ListPodsQueryDto): Promise<PaginatedPodsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repo.findAll({ page, limit, q: query.q, type: query.type, status: query.status ?? PodStatus.ACTIVE });
    return {
      data: result.data.map(PodResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string): Promise<PodResponseDto> {
    const pod = await this.getOrThrow(id);
    return PodResponseDto.fromEntity(pod);
  }

  async findByRef(podRef: string): Promise<PodResponseDto> {
    const pod = await this.repo.findByRef(podRef);
    if (!pod) throw new NotFoundException(`Pod '${podRef}' not found`);
    return PodResponseDto.fromEntity(pod);
  }

  async update(id: string, dto: UpdatePodDto, caller: AuthenticatedUser): Promise<PodResponseDto> {
    await this.getOrThrow(id);
    await this.auth.assertStewardOrAdmin(id, caller);
    const updated = await this.repo.update(id, dto);
    this.logger.log(`Pod updated: ${updated.podRef ?? id} by ${caller.id}`);
    return PodResponseDto.fromEntity(updated);
  }

  /** FORMING → ACTIVE, once a Steward has been institutionally appointed and the Pod is ready to gather. */
  async activate(id: string, caller: AuthenticatedUser): Promise<PodResponseDto> {
    const pod = await this.getOrThrow(id);
    await this.auth.assertStewardOrAdmin(id, caller);
    if (pod.status !== PodStatus.FORMING && pod.status !== PodStatus.DORMANT) {
      throw new ConflictException(`Pod is '${pod.status}'. Only a FORMING or DORMANT Pod can be activated.`);
    }
    const updated = await this.repo.update(id, { status: PodStatus.ACTIVE });
    this.logger.log(`Pod activated: ${updated.podRef ?? id} by ${caller.id}`);
    return PodResponseDto.fromEntity(updated);
  }

  /** No PodEvent held within dormancyThresholdDays — a signal for attention, never an automatic termination of anything else. */
  async markDormant(id: string, caller: AuthenticatedUser): Promise<PodResponseDto> {
    const pod = await this.getOrThrow(id);
    await this.auth.assertStewardOrAdmin(id, caller);
    if (pod.status !== PodStatus.ACTIVE) {
      throw new ConflictException(`Pod is '${pod.status}'. Only an ACTIVE Pod can be marked DORMANT.`);
    }
    const updated = await this.repo.update(id, { status: PodStatus.DORMANT });
    return PodResponseDto.fromEntity(updated);
  }

  /** Terminal, soft-deleted equivalent — history (messages, events, memberships) remains queryable for those who were part of it. */
  async archive(id: string, caller: AuthenticatedUser): Promise<PodResponseDto> {
    const pod = await this.getOrThrow(id);
    await this.auth.assertStewardOrAdmin(id, caller);
    if (pod.status === PodStatus.ARCHIVED) {
      throw new ConflictException('Pod is already ARCHIVED');
    }
    const updated = await this.repo.update(id, { status: PodStatus.ARCHIVED });
    this.logger.log(`Pod archived: ${updated.podRef ?? id} by ${caller.id}`);
    return PodResponseDto.fromEntity(updated);
  }

  private async getOrThrow(id: string) {
    const pod = await this.repo.findById(id);
    if (!pod) throw new NotFoundException(`Pod '${id}' not found`);
    return pod;
  }
}
