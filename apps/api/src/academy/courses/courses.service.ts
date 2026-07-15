import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AcademyContentStatus, NotificationCategory, UserRole, VerificationStatus } from '@prisma/client';
import type { Course } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { NotificationsService } from '../../communication/notifications/notifications.service';
import { IOrganizationRepository, ORGANIZATION_REPOSITORY } from '../../organizations/repositories/organization.repository.interface';
import { ACADEMY_STAFF_ROLES } from '../common/academy-roles.util';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ListCoursesQueryDto } from './dto/list-courses-query.dto';
import { RejectCourseDto } from './dto/reject-course.dto';
import { CourseResponseDto } from './dto/course-response.dto';
import { PaginatedCoursesResponseDto } from './dto/paginated-courses-response.dto';
import { CourseRevisionResponseDto } from './dto/revision-response.dto';
import { COURSE_REPOSITORY, ICourseRepository } from './repositories/course.repository.interface';
import {
  COURSE_REVISION_REPOSITORY,
  ICourseRevisionRepository,
} from './repositories/course-revision.repository.interface';

// Fields that constitute a substantive edit — changing any of these creates
// a CourseRevision snapshot of the pre-edit state and bumps `version`,
// mirroring KnowledgeService's REVISION_TRIGGER_FIELDS pattern (PA-013 /
// WO-028 "versioned curriculum").
const REVISION_TRIGGER_FIELDS = ['title', 'shortDescription', 'fullDescription'] as const;

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    @Inject(COURSE_REPOSITORY) private readonly repo: ICourseRepository,
    @Inject(COURSE_REVISION_REPOSITORY) private readonly revisionRepo: ICourseRevisionRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly organizationRepo: IOrganizationRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────

  async create(dto: CreateCourseDto, caller: AuthenticatedUser): Promise<CourseResponseDto> {
    if (dto.organizationId) {
      await this.assertOrganizationExists(dto.organizationId);
    }

    const course = await this.repo.create({
      ...dto,
      authorId: caller.id,
      lastUpdatedById: caller.id,
    });

    const courseRef = `AUR-CRS-${course.sequenceNumber.toString().padStart(6, '0')}`;
    const updated = await this.repo.setRef(course.id, courseRef);

    this.logger.log(`Course created: ${courseRef} by ${caller.id}`);
    return CourseResponseDto.fromEntity(updated);
  }

  // ── Read ──────────────────────────────────────────────────────────────

  async findAll(query: ListCoursesQueryDto): Promise<PaginatedCoursesResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    // Default: only show VERIFIED courses to the general audience — the
    // same "trustworthy by default" behavior Resources/Knowledge use.
    const verificationStatus = query.verificationStatus ?? VerificationStatus.VERIFIED;

    const result = await this.repo.findAll({
      page, limit, verificationStatus,
      q: query.q,
      learningDomain: query.learningDomain,
      status: query.status,
      authorId: query.authorId,
      organizationId: query.organizationId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      data: result.data.map(CourseResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string): Promise<CourseResponseDto> {
    const course = await this.repo.findById(id);
    if (!course) throw new NotFoundException(`Course '${id}' not found`);
    return CourseResponseDto.fromEntity(course);
  }

  async findByRef(courseRef: string): Promise<CourseResponseDto> {
    const course = await this.repo.findByRef(courseRef);
    if (!course) throw new NotFoundException(`Course '${courseRef}' not found`);
    return CourseResponseDto.fromEntity(course);
  }

  async findRevisions(id: string): Promise<CourseRevisionResponseDto[]> {
    const course = await this.repo.findById(id);
    if (!course) throw new NotFoundException(`Course '${id}' not found`);
    const revisions = await this.revisionRepo.findByCourse(id);
    return revisions.map(CourseRevisionResponseDto.fromEntity);
  }

  // ── Update ────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateCourseDto, caller: AuthenticatedUser): Promise<CourseResponseDto> {
    const existing = await this.getOwnedOrThrow(id, caller);

    if (dto.organizationId) {
      await this.assertOrganizationExists(dto.organizationId);
    }

    if (this.isSubstantiveEdit(dto)) {
      await this.revisionRepo.create({
        courseId: id,
        versionNumber: existing.version,
        title: existing.title,
        shortDescription: existing.shortDescription,
        fullDescription: existing.fullDescription,
        editedById: caller.id,
      });
    }

    const updated = await this.repo.update(id, {
      ...dto,
      version: this.isSubstantiveEdit(dto) ? existing.version + 1 : existing.version,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Course updated: ${updated.courseRef ?? id} by ${caller.id}`);
    return CourseResponseDto.fromEntity(updated);
  }

  // ── Soft delete ───────────────────────────────────────────────────────

  async remove(id: string, caller: AuthenticatedUser): Promise<void> {
    const existing = await this.getOwnedOrThrow(id, caller);
    await this.repo.softDelete(id);
    this.logger.log(`Course soft-deleted: ${existing.courseRef ?? id} by ${caller.id}`);
  }

  // ── Verification Workflow ────────────────────────────────────────────

  /** Move DRAFT → PENDING_REVIEW. Author, Steward, or Admin may submit. */
  async submitForReview(id: string, caller: AuthenticatedUser): Promise<CourseResponseDto> {
    const course = await this.getOwnedOrThrow(id, caller);

    if (course.verificationStatus !== VerificationStatus.DRAFT) {
      throw new ConflictException(
        `Course is in '${course.verificationStatus}' status. Only DRAFT courses can be submitted for review.`,
      );
    }

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.PENDING_REVIEW,
      status: AcademyContentStatus.DRAFT,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Course submitted for review: ${course.courseRef ?? id} by ${caller.id}`);
    return CourseResponseDto.fromEntity(updated);
  }

  /** Move PENDING_REVIEW → VERIFIED. Steward/Admin only (enforced by controller guard). */
  async verify(id: string, caller: AuthenticatedUser): Promise<CourseResponseDto> {
    const course = await this.repo.findById(id);
    if (!course) throw new NotFoundException(`Course '${id}' not found`);

    if (course.verificationStatus !== VerificationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Course is in '${course.verificationStatus}' status. Only PENDING_REVIEW courses can be verified.`,
      );
    }

    const now = new Date();
    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.VERIFIED,
      status: AcademyContentStatus.ACTIVE,
      datePublished: course.datePublished ?? now,
      rejectionReason: null,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Course verified: ${course.courseRef ?? id} by ${caller.id}`);
    await this.notifyAuthor(course, 'academy.course.verified', 'Your course was verified', `"${course.title}" has been verified and published.`);
    return CourseResponseDto.fromEntity(updated);
  }

  /** Move PENDING_REVIEW → REJECTED. Steward/Admin only (enforced by controller guard). */
  async reject(id: string, dto: RejectCourseDto, caller: AuthenticatedUser): Promise<CourseResponseDto> {
    const course = await this.repo.findById(id);
    if (!course) throw new NotFoundException(`Course '${id}' not found`);

    if (course.verificationStatus !== VerificationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Course is in '${course.verificationStatus}' status. Only PENDING_REVIEW courses can be rejected.`,
      );
    }

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.REJECTED,
      status: AcademyContentStatus.DRAFT,
      rejectionReason: dto.rejectionReason,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Course rejected: ${course.courseRef ?? id} by ${caller.id}`);
    await this.notifyAuthor(course, 'academy.course.rejected', 'Your course was not approved', `"${course.title}" was rejected: ${dto.rejectionReason}`);
    return CourseResponseDto.fromEntity(updated);
  }

  /** Archive a course regardless of current status. Author, Steward, or Admin. */
  async archive(id: string, caller: AuthenticatedUser): Promise<CourseResponseDto> {
    const course = await this.getOwnedOrThrow(id, caller);

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.ARCHIVED,
      status: AcademyContentStatus.ARCHIVED,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Course archived: ${course.courseRef ?? id} by ${caller.id}`);
    return CourseResponseDto.fromEntity(updated);
  }

  // ── Helpers (used by ModulesService/LessonsService too) ──────────────

  /**
   * Loads a course and enforces authorship: the course's author may manage
   * it, and Stewards/Admins may manage any course regardless of authorship
   * (moderation authority) — mirrors KnowledgeService.getOwnedOrThrow().
   */
  async getOwnedOrThrow(id: string, caller: AuthenticatedUser): Promise<Course> {
    const course = await this.repo.findById(id);
    if (!course) throw new NotFoundException(`Course '${id}' not found`);

    const isAuthor = course.authorId === caller.id;
    const isPrivileged = caller.roles.some((role) => ACADEMY_STAFF_ROLES.includes(role as UserRole));

    if (!isAuthor && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to manage this course');
    }

    return course;
  }

  private isSubstantiveEdit(dto: UpdateCourseDto): boolean {
    return REVISION_TRIGGER_FIELDS.some((field) => dto[field] !== undefined);
  }

  private async assertOrganizationExists(organizationId: string): Promise<void> {
    const organization = await this.organizationRepo.findById(organizationId);
    if (!organization) throw new NotFoundException(`Organization '${organizationId}' not found`);
  }

  /**
   * Third real domain-integration call site for Communication System's
   * notify() (after Announcements/WO-026 and Knowledge/WO-027) — notifies a
   * course's author of a verification-workflow outcome.
   */
  private async notifyAuthor(course: Course, type: string, title: string, body: string): Promise<void> {
    try {
      await this.notificationsService.notify({
        recipientId: course.authorId,
        category: NotificationCategory.ACADEMY,
        type,
        title,
        body,
        dedupeKey: `${type}:${course.id}:${course.version}`,
      });
    } catch (err) {
      this.logger.warn(`Failed to notify author ${course.authorId} for course ${course.id}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }
}
