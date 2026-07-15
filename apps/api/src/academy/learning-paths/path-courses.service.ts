import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { COURSE_REPOSITORY, ICourseRepository } from '../courses/repositories/course.repository.interface';
import { LearningPathsService } from './learning-paths.service';
import { AddPathCourseDto } from './dto/add-path-course.dto';
import { ReorderPathCourseDto } from './dto/reorder-path-course.dto';
import { PathCourseResponseDto } from './dto/path-course-response.dto';
import {
  ILearningPathCourseRepository,
  LEARNING_PATH_COURSE_REPOSITORY,
} from './repositories/learning-path-course.repository.interface';

@Injectable()
export class PathCoursesService {
  private readonly logger = new Logger(PathCoursesService.name);

  constructor(
    @Inject(LEARNING_PATH_COURSE_REPOSITORY) private readonly repo: ILearningPathCourseRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    private readonly learningPathsService: LearningPathsService,
  ) {}

  async add(learningPathId: string, dto: AddPathCourseDto, caller: AuthenticatedUser): Promise<PathCourseResponseDto> {
    await this.learningPathsService.getOwnedOrThrow(learningPathId, caller);

    const course = await this.courseRepo.findById(dto.courseId);
    if (!course) throw new NotFoundException(`Course '${dto.courseId}' not found`);

    const existing = await this.repo.findOne(learningPathId, dto.courseId);
    if (existing) throw new ConflictException('This course is already part of the learning path');

    const pathCourse = await this.repo.add({ learningPathId, courseId: dto.courseId, position: dto.position });
    this.logger.log(`Course ${dto.courseId} added to learning path ${learningPathId} by ${caller.id}`);
    return PathCourseResponseDto.fromEntity(pathCourse);
  }

  async findByPath(learningPathId: string): Promise<PathCourseResponseDto[]> {
    await this.learningPathsService.findById(learningPathId);
    const pathCourses = await this.repo.findByPath(learningPathId);
    return pathCourses.map(PathCourseResponseDto.fromEntity);
  }

  async reorder(
    learningPathId: string,
    courseId: string,
    dto: ReorderPathCourseDto,
    caller: AuthenticatedUser,
  ): Promise<PathCourseResponseDto> {
    await this.learningPathsService.getOwnedOrThrow(learningPathId, caller);

    const pathCourse = await this.repo.findOne(learningPathId, courseId);
    if (!pathCourse) throw new NotFoundException(`Course '${courseId}' is not part of this learning path`);

    const updated = await this.repo.updatePosition(pathCourse.id, dto.position);
    return PathCourseResponseDto.fromEntity(updated);
  }

  async remove(learningPathId: string, courseId: string, caller: AuthenticatedUser): Promise<void> {
    await this.learningPathsService.getOwnedOrThrow(learningPathId, caller);

    const pathCourse = await this.repo.findOne(learningPathId, courseId);
    if (!pathCourse) throw new NotFoundException(`Course '${courseId}' is not part of this learning path`);

    await this.repo.remove(pathCourse.id);
    this.logger.log(`Course ${courseId} removed from learning path ${learningPathId} by ${caller.id}`);
  }
}
