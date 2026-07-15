import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Module as ModuleModel } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { CoursesService } from './courses.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModuleResponseDto } from './dto/module-response.dto';
import { IModuleRepository, MODULE_REPOSITORY } from './repositories/module.repository.interface';

@Injectable()
export class ModulesService {
  private readonly logger = new Logger(ModulesService.name);

  constructor(
    @Inject(MODULE_REPOSITORY) private readonly repo: IModuleRepository,
    private readonly coursesService: CoursesService,
  ) {}

  async create(courseId: string, dto: CreateModuleDto, caller: AuthenticatedUser): Promise<ModuleResponseDto> {
    await this.coursesService.getOwnedOrThrow(courseId, caller);
    const module = await this.repo.create({ ...dto, courseId });
    this.logger.log(`Module created under course ${courseId} by ${caller.id}`);
    return ModuleResponseDto.fromEntity(module);
  }

  async findByCourse(courseId: string): Promise<ModuleResponseDto[]> {
    await this.coursesService.findById(courseId);
    const modules = await this.repo.findByCourse(courseId);
    return modules.map(ModuleResponseDto.fromEntity);
  }

  async findById(id: string): Promise<ModuleResponseDto> {
    const module = await this.getOrThrow(id);
    return ModuleResponseDto.fromEntity(module);
  }

  async update(id: string, dto: UpdateModuleDto, caller: AuthenticatedUser): Promise<ModuleResponseDto> {
    const module = await this.getOrThrow(id);
    await this.coursesService.getOwnedOrThrow(module.courseId, caller);
    const updated = await this.repo.update(id, dto);
    this.logger.log(`Module ${id} updated by ${caller.id}`);
    return ModuleResponseDto.fromEntity(updated);
  }

  async remove(id: string, caller: AuthenticatedUser): Promise<void> {
    const module = await this.getOrThrow(id);
    await this.coursesService.getOwnedOrThrow(module.courseId, caller);
    await this.repo.remove(id);
    this.logger.log(`Module ${id} removed by ${caller.id}`);
  }

  private async getOrThrow(id: string): Promise<ModuleModel> {
    const module = await this.repo.findById(id);
    if (!module) throw new NotFoundException(`Module '${id}' not found`);
    return module;
  }
}
