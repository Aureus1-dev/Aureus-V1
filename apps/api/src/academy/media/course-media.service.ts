import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { COURSE_REPOSITORY, ICourseRepository } from '../courses/repositories/course.repository.interface';
import { ILessonRepository, LESSON_REPOSITORY } from '../courses/repositories/lesson.repository.interface';
import { IModuleRepository, MODULE_REPOSITORY } from '../courses/repositories/module.repository.interface';
import { CoursesService } from '../courses/courses.service';
import { AddCourseMediaDto } from './dto/add-course-media.dto';
import { CourseMediaResponseDto } from './dto/course-media-response.dto';
import {
  COURSE_MEDIA_REPOSITORY,
  ICourseMediaRepository,
} from './repositories/course-media.repository.interface';
import {
  IMediaAssetRepository,
  MEDIA_ASSET_REPOSITORY,
} from './repositories/media-asset.repository.interface';

@Injectable()
export class CourseMediaService {
  private readonly logger = new Logger(CourseMediaService.name);

  constructor(
    @Inject(COURSE_MEDIA_REPOSITORY) private readonly repo: ICourseMediaRepository,
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaAssetRepo: IMediaAssetRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessonRepo: ILessonRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
    private readonly coursesService: CoursesService,
  ) {}

  async add(courseId: string, dto: AddCourseMediaDto, caller: AuthenticatedUser): Promise<CourseMediaResponseDto> {
    await this.coursesService.getOwnedOrThrow(courseId, caller);

    const mediaAsset = await this.mediaAssetRepo.findById(dto.mediaAssetId);
    if (!mediaAsset) throw new NotFoundException(`Media asset '${dto.mediaAssetId}' not found`);

    if (dto.lessonId) {
      const lesson = await this.lessonRepo.findById(dto.lessonId);
      if (!lesson) throw new NotFoundException(`Lesson '${dto.lessonId}' not found`);
      const module = await this.moduleRepo.findById(lesson.moduleId);
      if (!module || module.courseId !== courseId) {
        throw new NotFoundException(`Lesson '${dto.lessonId}' does not belong to course '${courseId}'`);
      }
    }

    const courseMedia = await this.repo.add({
      courseId,
      lessonId: dto.lessonId,
      mediaAssetId: dto.mediaAssetId,
      position: dto.position ?? 0,
    });

    this.logger.log(`Media asset ${dto.mediaAssetId} attached to course ${courseId} by ${caller.id}`);
    return CourseMediaResponseDto.fromEntity(courseMedia);
  }

  async findByCourse(courseId: string): Promise<CourseMediaResponseDto[]> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException(`Course '${courseId}' not found`);
    const items = await this.repo.findByCourse(courseId);
    return items.map(CourseMediaResponseDto.fromEntity);
  }

  async remove(courseId: string, id: string, caller: AuthenticatedUser): Promise<void> {
    await this.coursesService.getOwnedOrThrow(courseId, caller);

    const courseMedia = await this.repo.findById(id);
    if (!courseMedia || courseMedia.courseId !== courseId) {
      throw new NotFoundException(`Course media '${id}' not found on course '${courseId}'`);
    }

    await this.repo.remove(id);
    this.logger.log(`Course media ${id} removed from course ${courseId} by ${caller.id}`);
  }
}
