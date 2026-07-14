import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { PaginatedTasksResponseDto } from './dto/paginated-tasks-response.dto';
import { ITaskRepository, TASK_REPOSITORY } from './repositories/task.repository.interface';

@Injectable()
export class TasksService {
  constructor(@Inject(TASK_REPOSITORY) private readonly repo: ITaskRepository) {}

  async create(dto: CreateTaskDto): Promise<TaskResponseDto> {
    return TaskResponseDto.fromEntity(await this.repo.create(dto));
  }

  async findAll(query: ListTasksQueryDto): Promise<PaginatedTasksResponseDto> {
    const page = query.page ?? 1; const limit = query.limit ?? 20;
    const result = await this.repo.findAll({
      page, limit, milestoneId: query.milestoneId,
      status: query.status, priority: query.priority,
    });
    return {
      data: result.data.map(TaskResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string): Promise<TaskResponseDto> {
    const t = await this.repo.findById(id);
    if (!t) throw new NotFoundException(`Task '${id}' not found`);
    return TaskResponseDto.fromEntity(t);
  }

  async update(id: string, dto: UpdateTaskDto): Promise<TaskResponseDto> {
    if (!await this.repo.findById(id)) throw new NotFoundException(`Task '${id}' not found`);
    return TaskResponseDto.fromEntity(await this.repo.update(id, dto));
  }

  async remove(id: string): Promise<void> {
    if (!await this.repo.findById(id)) throw new NotFoundException(`Task '${id}' not found`);
    await this.repo.softDelete(id);
  }
}
