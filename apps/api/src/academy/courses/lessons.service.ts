import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Lesson, Module as ModuleModel } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import {
  IKnowledgeArticleRepository,
  KNOWLEDGE_ARTICLE_REPOSITORY,
} from '../../knowledge/repositories/knowledge-article.repository.interface';
import { CoursesService } from './courses.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonResponseDto } from './dto/lesson-response.dto';
import { ILessonRepository, LESSON_REPOSITORY } from './repositories/lesson.repository.interface';
import { IModuleRepository, MODULE_REPOSITORY } from './repositories/module.repository.interface';

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);

  constructor(
    @Inject(LESSON_REPOSITORY) private readonly repo: ILessonRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
    @Inject(KNOWLEDGE_ARTICLE_REPOSITORY) private readonly knowledgeArticleRepo: IKnowledgeArticleRepository,
    private readonly coursesService: CoursesService,
  ) {}

  async create(moduleId: string, dto: CreateLessonDto, caller: AuthenticatedUser): Promise<LessonResponseDto> {
    await this.getOwnedModuleOrThrow(moduleId, caller);
    if (dto.relatedArticleId) {
      await this.assertArticleExists(dto.relatedArticleId);
    }

    const lesson = await this.repo.create({ ...dto, moduleId });
    this.logger.log(`Lesson created under module ${moduleId} by ${caller.id}`);
    return LessonResponseDto.fromEntity(lesson);
  }

  async findByModule(moduleId: string): Promise<LessonResponseDto[]> {
    const module = await this.moduleRepo.findById(moduleId);
    if (!module) throw new NotFoundException(`Module '${moduleId}' not found`);
    const lessons = await this.repo.findByModule(moduleId);
    return lessons.map(LessonResponseDto.fromEntity);
  }

  async findByCourse(courseId: string): Promise<LessonResponseDto[]> {
    await this.coursesService.findById(courseId);
    const lessons = await this.repo.findByCourse(courseId);
    return lessons.map(LessonResponseDto.fromEntity);
  }

  async findById(id: string): Promise<LessonResponseDto> {
    const lesson = await this.getOrThrow(id);
    return LessonResponseDto.fromEntity(lesson);
  }

  async update(id: string, dto: UpdateLessonDto, caller: AuthenticatedUser): Promise<LessonResponseDto> {
    const lesson = await this.getOrThrow(id);
    await this.getOwnedModuleOrThrow(lesson.moduleId, caller);
    if (dto.relatedArticleId) {
      await this.assertArticleExists(dto.relatedArticleId);
    }

    const updated = await this.repo.update(id, dto);
    this.logger.log(`Lesson ${id} updated by ${caller.id}`);
    return LessonResponseDto.fromEntity(updated);
  }

  async remove(id: string, caller: AuthenticatedUser): Promise<void> {
    const lesson = await this.getOrThrow(id);
    await this.getOwnedModuleOrThrow(lesson.moduleId, caller);
    await this.repo.remove(id);
    this.logger.log(`Lesson ${id} removed by ${caller.id}`);
  }

  private async getOrThrow(id: string): Promise<Lesson> {
    const lesson = await this.repo.findById(id);
    if (!lesson) throw new NotFoundException(`Lesson '${id}' not found`);
    return lesson;
  }

  private async getOwnedModuleOrThrow(moduleId: string, caller: AuthenticatedUser): Promise<ModuleModel> {
    const module = await this.moduleRepo.findById(moduleId);
    if (!module) throw new NotFoundException(`Module '${moduleId}' not found`);
    await this.coursesService.getOwnedOrThrow(module.courseId, caller);
    return module;
  }

  private async assertArticleExists(articleId: string): Promise<void> {
    const article = await this.knowledgeArticleRepo.findById(articleId);
    if (!article) throw new NotFoundException(`Knowledge article '${articleId}' not found`);
  }
}
