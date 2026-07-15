import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { hasRole } from '../auth/utils/has-role.util';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ListGoalsQueryDto } from './dto/list-goals-query.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { PaginatedGoalsResponseDto } from './dto/paginated-goals-response.dto';
import { GOAL_REPOSITORY, IGoalRepository } from './repositories/goal.repository.interface';

const ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

@Injectable()
export class GoalsService {
  constructor(@Inject(GOAL_REPOSITORY) private readonly repo: IGoalRepository) {}

  async create(dto: CreateGoalDto, caller: AuthenticatedUser): Promise<GoalResponseDto> {
    const userId = dto.userId ?? caller.id;
    if (userId !== caller.id && !hasRole(caller, ADMIN_ROLES)) {
      throw new ForbiddenException('You may only create goals for yourself');
    }
    return GoalResponseDto.fromEntity(await this.repo.create({ ...dto, userId }));
  }

  async findAll(query: ListGoalsQueryDto, caller: AuthenticatedUser): Promise<PaginatedGoalsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const isAdmin = hasRole(caller, ADMIN_ROLES);

    if (query.userId && query.userId !== caller.id && !isAdmin) {
      throw new ForbiddenException('You may only list your own goals');
    }
    const userId = isAdmin ? query.userId : caller.id;

    const result = await this.repo.findAll({ page, limit, userId, status: query.status });
    return {
      data: result.data.map(GoalResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string, caller: AuthenticatedUser): Promise<GoalResponseDto> {
    const goal = await this.getOwnedOrThrow(id, caller);
    return GoalResponseDto.fromEntity(goal);
  }

  async update(id: string, dto: UpdateGoalDto, caller: AuthenticatedUser): Promise<GoalResponseDto> {
    await this.getOwnedOrThrow(id, caller);
    return GoalResponseDto.fromEntity(await this.repo.update(id, dto));
  }

  async remove(id: string, caller: AuthenticatedUser): Promise<void> {
    await this.getOwnedOrThrow(id, caller);
    await this.repo.softDelete(id);
  }

  private async getOwnedOrThrow(id: string, caller: AuthenticatedUser) {
    const goal = await this.repo.findById(id);
    if (!goal) throw new NotFoundException(`Goal '${id}' not found`);
    if (goal.userId !== caller.id && !hasRole(caller, ADMIN_ROLES)) {
      throw new ForbiddenException('You do not have permission to access this goal');
    }
    return goal;
  }
}
