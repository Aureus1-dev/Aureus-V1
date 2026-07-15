import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, Milestone } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { hasRole } from '../auth/utils/has-role.util';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { ListMilestonesQueryDto } from './dto/list-milestones-query.dto';
import { MilestoneResponseDto } from './dto/milestone-response.dto';
import { PaginatedMilestonesResponseDto } from './dto/paginated-milestones-response.dto';
import { IMilestoneRepository, MILESTONE_REPOSITORY } from './repositories/milestone.repository.interface';
import { JOURNEY_REPOSITORY, IJourneyRepository } from '../journeys/repositories/journey.repository.interface';

const ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

@Injectable()
export class MilestonesService {
  constructor(
    @Inject(MILESTONE_REPOSITORY) private readonly repo: IMilestoneRepository,
    @Inject(JOURNEY_REPOSITORY) private readonly journeyRepo: IJourneyRepository,
  ) {}

  async create(dto: CreateMilestoneDto, caller: AuthenticatedUser): Promise<MilestoneResponseDto> {
    await this.assertOwnsJourney(dto.journeyId, caller);
    return MilestoneResponseDto.fromEntity(await this.repo.create(dto));
  }

  async findAll(query: ListMilestonesQueryDto, caller: AuthenticatedUser): Promise<PaginatedMilestonesResponseDto> {
    const isAdmin = hasRole(caller, ADMIN_ROLES);
    if (!query.journeyId && !isAdmin) {
      throw new ForbiddenException('You must specify a journeyId you own to list milestones');
    }
    if (query.journeyId) {
      await this.assertOwnsJourney(query.journeyId, caller);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repo.findAll({ page, limit, journeyId: query.journeyId, status: query.status });
    return {
      data: result.data.map(MilestoneResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string, caller: AuthenticatedUser): Promise<MilestoneResponseDto> {
    const milestone = await this.getOwnedOrThrow(id, caller);
    return MilestoneResponseDto.fromEntity(milestone);
  }

  async update(id: string, dto: UpdateMilestoneDto, caller: AuthenticatedUser): Promise<MilestoneResponseDto> {
    await this.getOwnedOrThrow(id, caller);
    return MilestoneResponseDto.fromEntity(await this.repo.update(id, dto));
  }

  async remove(id: string, caller: AuthenticatedUser): Promise<void> {
    await this.getOwnedOrThrow(id, caller);
    await this.repo.softDelete(id);
  }

  private async assertOwnsJourney(journeyId: string, caller: AuthenticatedUser): Promise<void> {
    const journey = await this.journeyRepo.findById(journeyId);
    if (!journey) throw new NotFoundException(`Journey '${journeyId}' not found`);
    if (hasRole(caller, ADMIN_ROLES)) return;
    const ownerId = await this.journeyRepo.findOwnerId(journeyId);
    if (ownerId !== caller.id) {
      throw new ForbiddenException('You do not have permission to act on this journey');
    }
  }

  private async getOwnedOrThrow(id: string, caller: AuthenticatedUser): Promise<Milestone> {
    const milestone = await this.repo.findById(id);
    if (!milestone) throw new NotFoundException(`Milestone '${id}' not found`);
    if (hasRole(caller, ADMIN_ROLES)) return milestone;
    const ownerId = await this.repo.findOwnerId(id);
    if (ownerId !== caller.id) {
      throw new ForbiddenException('You do not have permission to access this milestone');
    }
    return milestone;
  }
}
