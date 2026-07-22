import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CitySheetEntryStatus, CitySheetVerificationStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateCitySheetEntryDto } from './dto/create-city-sheet-entry.dto';
import { UpdateCitySheetEntryDto } from './dto/update-city-sheet-entry.dto';
import { ListCitySheetEntriesQueryDto } from './dto/list-city-sheet-entries-query.dto';
import { VerifyCitySheetEntryDto } from './dto/verify-city-sheet-entry.dto';
import { FlagCitySheetEntryForReviewDto } from './dto/flag-city-sheet-entry-for-review.dto';
import { CitySheetEntryResponseDto } from './dto/city-sheet-entry-response.dto';
import { PaginatedCitySheetEntriesResponseDto } from './dto/paginated-city-sheet-entries-response.dto';
import {
  CITY_SHEET_ENTRY_REPOSITORY,
  ICitySheetEntryRepository,
} from './repositories/city-sheet-entry.repository.interface';

@Injectable()
export class CitySheetService {
  private readonly logger = new Logger(CitySheetService.name);

  constructor(
    @Inject(CITY_SHEET_ENTRY_REPOSITORY) private readonly repo: ICitySheetEntryRepository,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────

  async create(
    dto: CreateCitySheetEntryDto, caller: AuthenticatedUser,
  ): Promise<CitySheetEntryResponseDto> {
    const entry = await this.repo.create({ ...dto, createdById: caller.id });

    const citySheetRef = `AUR-CS-${entry.sequenceNumber.toString().padStart(6, '0')}`;
    const updated = await this.repo.setRef(entry.id, citySheetRef);

    this.logger.log(`City sheet entry created: ${citySheetRef} by ${caller.id}`);
    return CitySheetEntryResponseDto.fromEntity(updated);
  }

  // ── Read ──────────────────────────────────────────────────────────────

  async findAll(query: ListCitySheetEntriesQueryDto): Promise<PaginatedCitySheetEntriesResponseDto> {
    const page  = query.page  ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.repo.findAll({
      page, limit,
      q:                  query.q,
      category:           query.category,
      launchScope:        query.launchScope,
      verificationStatus: query.verificationStatus,
      status:             query.status,
    });

    return {
      data:       result.data.map(CitySheetEntryResponseDto.fromEntity),
      total:      result.total,
      page:       result.page,
      limit:      result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    };
  }

  async findById(id: string): Promise<CitySheetEntryResponseDto> {
    const entry = await this.repo.findById(id);
    if (!entry) throw new NotFoundException(`City sheet entry '${id}' not found`);
    return CitySheetEntryResponseDto.fromEntity(entry);
  }

  async findByRef(citySheetRef: string): Promise<CitySheetEntryResponseDto> {
    const entry = await this.repo.findByRef(citySheetRef);
    if (!entry) throw new NotFoundException(`City sheet entry '${citySheetRef}' not found`);
    return CitySheetEntryResponseDto.fromEntity(entry);
  }

  // ── Update ────────────────────────────────────────────────────────────

  async update(
    id: string, dto: UpdateCitySheetEntryDto, caller: AuthenticatedUser,
  ): Promise<CitySheetEntryResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`City sheet entry '${id}' not found`);

    const updated = await this.repo.update(id, dto);

    this.logger.log(`City sheet entry updated: ${updated.citySheetRef ?? id} by ${caller.id}`);
    return CitySheetEntryResponseDto.fromEntity(updated);
  }

  // ── Archive ───────────────────────────────────────────────────────────

  /** Mark an entry INACTIVE regardless of current verification status. Reverse via update({ status: ACTIVE }). */
  async archive(id: string, caller: AuthenticatedUser): Promise<CitySheetEntryResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`City sheet entry '${id}' not found`);

    const updated = await this.repo.update(id, { status: CitySheetEntryStatus.INACTIVE });

    this.logger.log(`City sheet entry archived: ${existing.citySheetRef ?? id} by ${caller.id}`);
    return CitySheetEntryResponseDto.fromEntity(updated);
  }

  // ── Verification lifecycle (A1: UNVERIFIED / VERIFIED / NEEDS_REVIEW) ──

  /** Move UNVERIFIED or NEEDS_REVIEW → VERIFIED. Records who verified it and when, per A4's acceptance criteria. */
  async verify(
    id: string, dto: VerifyCitySheetEntryDto, caller: AuthenticatedUser,
  ): Promise<CitySheetEntryResponseDto> {
    const entry = await this.repo.findById(id);
    if (!entry) throw new NotFoundException(`City sheet entry '${id}' not found`);

    if (entry.verificationStatus === CitySheetVerificationStatus.VERIFIED) {
      throw new ConflictException(
        `City sheet entry is already VERIFIED. Use flag-for-review first if it needs to be re-checked.`,
      );
    }

    const now = new Date();
    const updated = await this.repo.update(id, {
      verificationStatus: CitySheetVerificationStatus.VERIFIED,
      lastVerifiedAt:      now,
      verifiedById:        caller.id,
      verificationNotes:   dto.verificationNotes,
      nextReviewDueAt:     dto.nextReviewDueAt ? new Date(dto.nextReviewDueAt) : undefined,
    });

    this.logger.log(`City sheet entry verified: ${entry.citySheetRef ?? id} by ${caller.id}`);
    return CitySheetEntryResponseDto.fromEntity(updated);
  }

  /** Move VERIFIED → NEEDS_REVIEW when something about a previously-verified entry looks stale or wrong. */
  async flagForReview(
    id: string, dto: FlagCitySheetEntryForReviewDto, caller: AuthenticatedUser,
  ): Promise<CitySheetEntryResponseDto> {
    const entry = await this.repo.findById(id);
    if (!entry) throw new NotFoundException(`City sheet entry '${id}' not found`);

    if (entry.verificationStatus !== CitySheetVerificationStatus.VERIFIED) {
      throw new ConflictException(
        `City sheet entry is in '${entry.verificationStatus}' status. Only VERIFIED entries can be flagged for review.`,
      );
    }

    const updated = await this.repo.update(id, {
      verificationStatus: CitySheetVerificationStatus.NEEDS_REVIEW,
      verificationNotes:   dto.reason,
    });

    this.logger.log(`City sheet entry flagged for review: ${entry.citySheetRef ?? id} by ${caller.id}`);
    return CitySheetEntryResponseDto.fromEntity(updated);
  }
}
