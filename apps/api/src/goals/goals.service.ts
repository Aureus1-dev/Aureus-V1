import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ListGoalsQueryDto } from './dto/list-goals-query.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { PaginatedGoalsResponseDto } from './dto/paginated-goals-response.dto';
import { GOAL_REPOSITORY, IGoalRepository } from './repositories/goal.repository.interface';

@Injectable()
export class GoalsService {
  constructor(@Inject(GOAL_REPOSITORY) private readonly repo: IGoalRepository) {}

  async create(dto: CreateGoalDto): Promise<GoalResponseDto> {
    return GoalResponseDto.fromEntity(await this.repo.create(dto));
  }

  async findAll(query: ListGoalsQueryDto): Promise<PaginatedGoalsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repo.findAll({ page, limit, userId: query.userId, status: query.status });
    return {
      data: result.data.map(GoalResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string): Promise<GoalResponseDto> {
    const goal = await this.repo.findById(id);
    if (!goal) throw new NotFoundException(`Goal '${id}' not found`);
    return GoalResponseDto.fromEntity(goal);
  }

  async update(id: string, dto: UpdateGoalDto): Promise<GoalResponseDto> {
    if (!await this.repo.findById(id)) throw new NotFoundException(`Goal '${id}' not found`);
    return GoalResponseDto.fromEntity(await this.repo.update(id, dto));
  }

  async remove(id: string): Promise<void> {
    if (!await this.repo.findById(id)) throw new NotFoundException(`Goal '${id}' not found`);
    await this.repo.softDelete(id);
  }
}
