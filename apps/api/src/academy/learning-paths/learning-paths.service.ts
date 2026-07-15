import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AcademyContentStatus, NotificationCategory, UserRole, VerificationStatus } from '@prisma/client';
import type { LearningPath } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { NotificationsService } from '../../communication/notifications/notifications.service';
import { ACADEMY_STAFF_ROLES } from '../common/academy-roles.util';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';
import { UpdateLearningPathDto } from './dto/update-learning-path.dto';
import { ListLearningPathsQueryDto } from './dto/list-learning-paths-query.dto';
import { RejectLearningPathDto } from './dto/reject-learning-path.dto';
import { LearningPathResponseDto } from './dto/learning-path-response.dto';
import { PaginatedLearningPathsResponseDto } from './dto/paginated-learning-paths-response.dto';
import {
  ILearningPathRepository,
  LEARNING_PATH_REPOSITORY,
} from './repositories/learning-path.repository.interface';

@Injectable()
export class LearningPathsService {
  private readonly logger = new Logger(LearningPathsService.name);

  constructor(
    @Inject(LEARNING_PATH_REPOSITORY) private readonly repo: ILearningPathRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────

  async create(dto: CreateLearningPathDto, caller: AuthenticatedUser): Promise<LearningPathResponseDto> {
    const path = await this.repo.create({
      ...dto,
      authorId: caller.id,
      lastUpdatedById: caller.id,
    });

    const pathRef = `AUR-LP-${path.sequenceNumber.toString().padStart(6, '0')}`;
    const updated = await this.repo.setRef(path.id, pathRef);

    this.logger.log(`Learning path created: ${pathRef} by ${caller.id}`);
    return LearningPathResponseDto.fromEntity(updated);
  }

  // ── Read ──────────────────────────────────────────────────────────────

  async findAll(query: ListLearningPathsQueryDto): Promise<PaginatedLearningPathsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const verificationStatus = query.verificationStatus ?? VerificationStatus.VERIFIED;

    const result = await this.repo.findAll({
      page, limit, verificationStatus,
      q: query.q,
      status: query.status,
      authorId: query.authorId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return {
      data: result.data.map(LearningPathResponseDto.fromEntity),
      total: result.total, page: result.page, limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string): Promise<LearningPathResponseDto> {
    const path = await this.repo.findById(id);
    if (!path) throw new NotFoundException(`Learning path '${id}' not found`);
    return LearningPathResponseDto.fromEntity(path);
  }

  async findByRef(pathRef: string): Promise<LearningPathResponseDto> {
    const path = await this.repo.findByRef(pathRef);
    if (!path) throw new NotFoundException(`Learning path '${pathRef}' not found`);
    return LearningPathResponseDto.fromEntity(path);
  }

  // ── Update ────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateLearningPathDto, caller: AuthenticatedUser): Promise<LearningPathResponseDto> {
    await this.getOwnedOrThrow(id, caller);

    const updated = await this.repo.update(id, { ...dto, lastUpdatedById: caller.id });

    this.logger.log(`Learning path updated: ${updated.pathRef ?? id} by ${caller.id}`);
    return LearningPathResponseDto.fromEntity(updated);
  }

  // ── Soft delete ───────────────────────────────────────────────────────

  async remove(id: string, caller: AuthenticatedUser): Promise<void> {
    const existing = await this.getOwnedOrThrow(id, caller);
    await this.repo.softDelete(id);
    this.logger.log(`Learning path soft-deleted: ${existing.pathRef ?? id} by ${caller.id}`);
  }

  // ── Verification Workflow ────────────────────────────────────────────

  async submitForReview(id: string, caller: AuthenticatedUser): Promise<LearningPathResponseDto> {
    const path = await this.getOwnedOrThrow(id, caller);

    if (path.verificationStatus !== VerificationStatus.DRAFT) {
      throw new ConflictException(
        `Learning path is in '${path.verificationStatus}' status. Only DRAFT paths can be submitted for review.`,
      );
    }

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.PENDING_REVIEW,
      status: AcademyContentStatus.DRAFT,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Learning path submitted for review: ${path.pathRef ?? id} by ${caller.id}`);
    return LearningPathResponseDto.fromEntity(updated);
  }

  async verify(id: string, caller: AuthenticatedUser): Promise<LearningPathResponseDto> {
    const path = await this.repo.findById(id);
    if (!path) throw new NotFoundException(`Learning path '${id}' not found`);

    if (path.verificationStatus !== VerificationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Learning path is in '${path.verificationStatus}' status. Only PENDING_REVIEW paths can be verified.`,
      );
    }

    const now = new Date();
    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.VERIFIED,
      status: AcademyContentStatus.ACTIVE,
      datePublished: path.datePublished ?? now,
      rejectionReason: null,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Learning path verified: ${path.pathRef ?? id} by ${caller.id}`);
    await this.notifyAuthor(path, 'academy.path.verified', 'Your learning path was verified', `"${path.title}" has been verified and published.`);
    return LearningPathResponseDto.fromEntity(updated);
  }

  async reject(id: string, dto: RejectLearningPathDto, caller: AuthenticatedUser): Promise<LearningPathResponseDto> {
    const path = await this.repo.findById(id);
    if (!path) throw new NotFoundException(`Learning path '${id}' not found`);

    if (path.verificationStatus !== VerificationStatus.PENDING_REVIEW) {
      throw new ConflictException(
        `Learning path is in '${path.verificationStatus}' status. Only PENDING_REVIEW paths can be rejected.`,
      );
    }

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.REJECTED,
      status: AcademyContentStatus.DRAFT,
      rejectionReason: dto.rejectionReason,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Learning path rejected: ${path.pathRef ?? id} by ${caller.id}`);
    await this.notifyAuthor(path, 'academy.path.rejected', 'Your learning path was not approved', `"${path.title}" was rejected: ${dto.rejectionReason}`);
    return LearningPathResponseDto.fromEntity(updated);
  }

  async archive(id: string, caller: AuthenticatedUser): Promise<LearningPathResponseDto> {
    const path = await this.getOwnedOrThrow(id, caller);

    const updated = await this.repo.update(id, {
      verificationStatus: VerificationStatus.ARCHIVED,
      status: AcademyContentStatus.ARCHIVED,
      lastUpdatedById: caller.id,
    });

    this.logger.log(`Learning path archived: ${path.pathRef ?? id} by ${caller.id}`);
    return LearningPathResponseDto.fromEntity(updated);
  }

  // ── Helpers (used by PathCoursesService too) ─────────────────────────

  async getOwnedOrThrow(id: string, caller: AuthenticatedUser): Promise<LearningPath> {
    const path = await this.repo.findById(id);
    if (!path) throw new NotFoundException(`Learning path '${id}' not found`);

    const isAuthor = path.authorId === caller.id;
    const isPrivileged = caller.roles.some((role) => ACADEMY_STAFF_ROLES.includes(role as UserRole));

    if (!isAuthor && !isPrivileged) {
      throw new ForbiddenException('You do not have permission to manage this learning path');
    }

    return path;
  }

  private async notifyAuthor(path: LearningPath, type: string, title: string, body: string): Promise<void> {
    try {
      await this.notificationsService.notify({
        recipientId: path.authorId,
        category: NotificationCategory.ACADEMY,
        type,
        title,
        body,
        dedupeKey: `${type}:${path.id}`,
      });
    } catch (err) {
      this.logger.warn(`Failed to notify author ${path.authorId} for learning path ${path.id}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }
}
