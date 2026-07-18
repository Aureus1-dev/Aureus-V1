import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, Task } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { hasRole } from '../auth/utils/has-role.util';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { PaginatedTasksResponseDto } from './dto/paginated-tasks-response.dto';
import { ITaskRepository, TASK_REPOSITORY } from './repositories/task.repository.interface';
import { MILESTONE_REPOSITORY, IMilestoneRepository } from '../milestones/repositories/milestone.repository.interface';

const ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

@Injectable()
export class TasksService {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly repo: ITaskRepository,
    @Inject(MILESTONE_REPOSITORY) private readonly milestoneRepo: IMilestoneRepository,
  ) {}

  async create(dto: CreateTaskDto, caller: AuthenticatedUser): Promise<TaskResponseDto> {
    await this.assertOwnsMilestone(dto.milestoneId, caller);
    return TaskResponseDto.fromEntity(await this.repo.create(dto));
  }

  async findAll(query: ListTasksQueryDto, caller: AuthenticatedUser): Promise<PaginatedTasksResponseDto> {
    const isAdmin = hasRole(caller, ADMIN_ROLES);
    if (query.milestoneId) {
      await this.assertOwnsMilestone(query.milestoneId, caller);
    }

    // No milestoneId: a member sees their own tasks across every milestone
    // (PR-002 — the standing Tasks surface); an Administrator sees every
    // task platform-wide, matching the existing Administrator-can-manage
    // access pattern used throughout findById/update/remove below.
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repo.findAll({
      page, limit, milestoneId: query.milestoneId,
      userId: !query.milestoneId && !isAdmin ? caller.id : undefined,
      status: query.status, priority: query.priority,
    });
    return {
      data: result.data.map(TaskResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string, caller: AuthenticatedUser): Promise<TaskResponseDto> {
    const task = await this.getOwnedOrThrow(id, caller);
    return TaskResponseDto.fromEntity(task);
  }

  async update(id: string, dto: UpdateTaskDto, caller: AuthenticatedUser): Promise<TaskResponseDto> {
    await this.getOwnedOrThrow(id, caller);
    return TaskResponseDto.fromEntity(await this.repo.update(id, dto));
  }

  async remove(id: string, caller: AuthenticatedUser): Promise<void> {
    await this.getOwnedOrThrow(id, caller);
    await this.repo.softDelete(id);
  }

  private async assertOwnsMilestone(milestoneId: string, caller: AuthenticatedUser): Promise<void> {
    const milestone = await this.milestoneRepo.findById(milestoneId);
    if (!milestone) throw new NotFoundException(`Milestone '${milestoneId}' not found`);
    if (hasRole(caller, ADMIN_ROLES)) return;
    const ownerId = await this.milestoneRepo.findOwnerId(milestoneId);
    if (ownerId !== caller.id) {
      throw new ForbiddenException('You do not have permission to act on this milestone');
    }
  }

  private async getOwnedOrThrow(id: string, caller: AuthenticatedUser): Promise<Task> {
    const task = await this.repo.findById(id);
    if (!task) throw new NotFoundException(`Task '${id}' not found`);
    if (hasRole(caller, ADMIN_ROLES)) return task;
    const ownerId = await this.repo.findOwnerId(id);
    if (ownerId !== caller.id) {
      throw new ForbiddenException('You do not have permission to access this task');
    }
    return task;
  }
}
