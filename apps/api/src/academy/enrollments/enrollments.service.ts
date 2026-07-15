import { ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, LessonProgressStatus, NotificationCategory } from '@prisma/client';
import type { Enrollment } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { NotificationsService } from '../../communication/notifications/notifications.service';
import { COURSE_REPOSITORY, ICourseRepository } from '../courses/repositories/course.repository.interface';
import { ILessonRepository, LESSON_REPOSITORY } from '../courses/repositories/lesson.repository.interface';
import { IModuleRepository, MODULE_REPOSITORY } from '../courses/repositories/module.repository.interface';
import { ACADEMY_STAFF_ROLES } from '../common/academy-roles.util';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { LessonProgressResponseDto } from './dto/lesson-progress-response.dto';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
import {
  ENROLLMENT_REPOSITORY,
  IEnrollmentRepository,
} from './repositories/enrollment.repository.interface';
import {
  ILessonProgressRepository,
  LESSON_PROGRESS_REPOSITORY,
} from './repositories/lesson-progress.repository.interface';
import {
  CERTIFICATION_REPOSITORY,
  ICertificationRepository,
} from './repositories/certification.repository.interface';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    @Inject(ENROLLMENT_REPOSITORY) private readonly repo: IEnrollmentRepository,
    @Inject(LESSON_PROGRESS_REPOSITORY) private readonly progressRepo: ILessonProgressRepository,
    @Inject(CERTIFICATION_REPOSITORY) private readonly certificationRepo: ICertificationRepository,
    @Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository,
    @Inject(LESSON_REPOSITORY) private readonly lessonRepo: ILessonRepository,
    @Inject(MODULE_REPOSITORY) private readonly moduleRepo: IModuleRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Enroll ────────────────────────────────────────────────────────────

  async enroll(courseId: string, caller: AuthenticatedUser): Promise<EnrollmentResponseDto> {
    const course = await this.courseRepo.findById(courseId);
    if (!course) throw new NotFoundException(`Course '${courseId}' not found`);

    const existing = await this.repo.findByUserAndCourse(caller.id, courseId);
    if (existing) throw new ConflictException('You are already enrolled in this course');

    const enrollment = await this.repo.create({ userId: caller.id, courseId });
    this.logger.log(`User ${caller.id} enrolled in course ${courseId}`);
    return EnrollmentResponseDto.fromEntity(enrollment);
  }

  // ── Read ──────────────────────────────────────────────────────────────

  async findMine(caller: AuthenticatedUser): Promise<EnrollmentResponseDto[]> {
    const enrollments = await this.repo.findByUser(caller.id);
    return enrollments.map(EnrollmentResponseDto.fromEntity);
  }

  async findById(id: string, caller: AuthenticatedUser): Promise<EnrollmentResponseDto> {
    const enrollment = await this.getOwnedOrThrow(id, caller);
    return EnrollmentResponseDto.fromEntity(enrollment);
  }

  async findProgress(id: string, caller: AuthenticatedUser): Promise<LessonProgressResponseDto[]> {
    await this.getOwnedOrThrow(id, caller);
    const progress = await this.progressRepo.findByEnrollment(id);
    return progress.map(LessonProgressResponseDto.fromEntity);
  }

  // ── Progress tracking / auto-completion ─────────────────────────────

  async updateLessonProgress(
    enrollmentId: string,
    lessonId: string,
    dto: UpdateLessonProgressDto,
    caller: AuthenticatedUser,
  ): Promise<LessonProgressResponseDto> {
    const enrollment = await this.getOwnedOrThrow(enrollmentId, caller);

    const lesson = await this.lessonRepo.findById(lessonId);
    if (!lesson) throw new NotFoundException(`Lesson '${lessonId}' not found`);
    const module = await this.moduleRepo.findById(lesson.moduleId);
    if (!module || module.courseId !== enrollment.courseId) {
      throw new NotFoundException(`Lesson '${lessonId}' does not belong to this enrollment's course`);
    }

    const existing = await this.progressRepo.findByEnrollmentAndLesson(enrollmentId, lessonId);
    const now = new Date();
    const updated = await this.progressRepo.upsert({
      enrollmentId,
      lessonId,
      status: dto.status,
      startedAt: existing?.startedAt ?? (dto.status !== LessonProgressStatus.NOT_STARTED ? now : undefined),
      completedAt: dto.status === LessonProgressStatus.COMPLETED ? now : null,
    });

    if (dto.status === LessonProgressStatus.COMPLETED) {
      await this.checkForCourseCompletion(enrollment);
    }

    return LessonProgressResponseDto.fromEntity(updated);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private async getOwnedOrThrow(id: string, caller: AuthenticatedUser): Promise<Enrollment> {
    const enrollment = await this.repo.findById(id);
    if (!enrollment) throw new NotFoundException(`Enrollment '${id}' not found`);

    if (enrollment.userId !== caller.id && !hasRole(caller, ACADEMY_STAFF_ROLES)) {
      throw new ForbiddenException('You may only access your own enrollments');
    }

    return enrollment;
  }

  /**
   * "Course completion" + "Steward certification foundation" (WO-028): once
   * every Lesson in the course reaches COMPLETED, the Enrollment
   * auto-transitions to COMPLETED and, if the course grants certification, a
   * Certification is auto-issued and the learner is notified — the third
   * real Communication System notify() call site alongside Knowledge/
   * Announcements (ADR-014).
   */
  private async checkForCourseCompletion(enrollment: Enrollment): Promise<void> {
    if (enrollment.status === EnrollmentStatus.COMPLETED) return;

    const lessons = await this.lessonRepo.findByCourse(enrollment.courseId);
    if (lessons.length === 0) return;

    const completedCount = await this.progressRepo.countCompletedByEnrollment(enrollment.id);
    if (completedCount < lessons.length) return;

    const now = new Date();
    await this.repo.update(enrollment.id, { status: EnrollmentStatus.COMPLETED, completedAt: now });
    this.logger.log(`Enrollment ${enrollment.id} auto-completed for user ${enrollment.userId}`);

    const course = await this.courseRepo.findById(enrollment.courseId);
    if (!course) return;

    await this.notifyLearner(
      enrollment.userId,
      'academy.course.completed',
      'Course completed',
      `You have completed "${course.title}".`,
      `academy.course.completed:${enrollment.id}`,
    );

    if (course.grantsCertification) {
      const existingCert = await this.certificationRepo.findByUserAndCourse(enrollment.userId, enrollment.courseId);
      if (!existingCert) {
        const certification = await this.certificationRepo.create({
          userId: enrollment.userId,
          courseId: enrollment.courseId,
        });
        const certificateRef = `AUR-CERT-${certification.sequenceNumber.toString().padStart(6, '0')}`;
        await this.certificationRepo.setRef(certification.id, certificateRef);

        this.logger.log(`Certification issued: ${certificateRef} to user ${enrollment.userId} for course ${enrollment.courseId}`);
        await this.notifyLearner(
          enrollment.userId,
          'academy.certification.issued',
          'Certification issued',
          `You have earned a certification for completing "${course.title}".`,
          `academy.certification.issued:${certification.id}`,
        );
      }
    }
  }

  private async notifyLearner(recipientId: string, type: string, title: string, body: string, dedupeKey: string): Promise<void> {
    try {
      await this.notificationsService.notify({
        recipientId,
        category: NotificationCategory.ACADEMY,
        type,
        title,
        body,
        dedupeKey,
      });
    } catch (err) {
      this.logger.warn(`Failed to notify learner ${recipientId}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }
}
