import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CitySheetEntryStatus, CitySheetVerificationEventType, CitySheetVerificationStatus } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateCitySheetEntryDto } from './dto/create-city-sheet-entry.dto';
import { UpdateCitySheetEntryDto } from './dto/update-city-sheet-entry.dto';
import { ListCitySheetEntriesQueryDto } from './dto/list-city-sheet-entries-query.dto';
import { VerifyCitySheetEntryDto } from './dto/verify-city-sheet-entry.dto';
import { FlagCitySheetEntryForReviewDto } from './dto/flag-city-sheet-entry-for-review.dto';
import { RejectCitySheetEntryDto } from './dto/reject-city-sheet-entry.dto';
import { CitySheetEntryResponseDto } from './dto/city-sheet-entry-response.dto';
import { PaginatedCitySheetEntriesResponseDto } from './dto/paginated-city-sheet-entries-response.dto';
import { VerificationEventResponseDto } from './dto/verification-event-response.dto';
import { VerificationGuideResponseDto } from './dto/verification-guide-response.dto';
import {
  CITY_SHEET_ENTRY_REPOSITORY,
  ChecklistResponseRecord,
  ICitySheetEntryRepository,
} from './repositories/city-sheet-entry.repository.interface';
import { ChecklistItemsService } from './checklist/checklist-items.service';
import { buildCallScript } from './call-script.util';

@Injectable()
export class CitySheetService {
  private readonly logger = new Logger(CitySheetService.name);

  constructor(
    @Inject(CITY_SHEET_ENTRY_REPOSITORY) private readonly repo: ICitySheetEntryRepository,
    private readonly checklistItems: ChecklistItemsService,
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

  // ── A4-PREP: Human Steward Verification Workflow ─────────────────────
  //
  // Every action below appends a permanent row to CitySheetVerificationEvent
  // (see repo.appendVerificationEvent) in addition to updating the entry's
  // own current-state fields — so no verification event is ever lost, even
  // though the entry itself only ever reflects its latest status. Only
  // STEWARD/PLATFORM_ADMINISTRATOR callers ever reach these methods — that
  // is enforced entirely by CitySheetController's guard, not by anything
  // here, so this workflow can be as helpful as it likes without ever being
  // the thing that decides whether a candidate is real.

  /** Everything a Human Steward needs to complete one A4 verification call: current facts, the applicable checklist, and a ready-to-read call script. */
  async getVerificationGuide(id: string): Promise<VerificationGuideResponseDto> {
    const entry = await this.repo.findById(id);
    if (!entry) throw new NotFoundException(`City sheet entry '${id}' not found`);

    const items = await this.checklistItems.findApplicableForCategory(entry.category);
    const checklist = items.map((i) => ({ id: i.id, label: i.label }));

    return {
      citySheetEntryId: entry.id,
      citySheetRef: entry.citySheetRef,
      organizationName: entry.organizationName,
      category: entry.category,
      currentVerificationStatus: entry.verificationStatus,
      checklist,
      callScript: buildCallScript(entry, checklist),
    };
  }

  /** Full, permanent verification history for one entry, oldest first. */
  async listVerificationEvents(id: string): Promise<VerificationEventResponseDto[]> {
    const entry = await this.repo.findById(id);
    if (!entry) throw new NotFoundException(`City sheet entry '${id}' not found`);

    const events = await this.repo.listVerificationEvents(id);
    return events.map(VerificationEventResponseDto.fromEntity);
  }

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

    const previousStatus = entry.verificationStatus;
    const now = new Date();
    const updated = await this.repo.update(id, {
      verificationStatus:     CitySheetVerificationStatus.VERIFIED,
      verificationConfidence: dto.confidence,
      lastVerifiedAt:         now,
      verifiedById:           caller.id,
      verificationNotes:      dto.verificationNotes,
      rejectionReason:        null,
      nextReviewDueAt:        dto.nextReviewDueAt ? new Date(dto.nextReviewDueAt) : undefined,
    });

    await this.repo.appendVerificationEvent({
      citySheetEntryId: id,
      eventType: CitySheetVerificationEventType.VERIFIED,
      previousStatus,
      newStatus: CitySheetVerificationStatus.VERIFIED,
      confidence: dto.confidence,
      notes: dto.verificationNotes,
      checklistResponses: toChecklistRecords(dto.checklistResponses),
      performedById: caller.id,
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

    const previousStatus = entry.verificationStatus;
    const updated = await this.repo.update(id, {
      verificationStatus: CitySheetVerificationStatus.NEEDS_REVIEW,
      verificationNotes:   dto.reason,
    });

    await this.repo.appendVerificationEvent({
      citySheetEntryId: id,
      eventType: CitySheetVerificationEventType.FLAGGED_FOR_REVIEW,
      previousStatus,
      newStatus: CitySheetVerificationStatus.NEEDS_REVIEW,
      confidence: dto.confidence,
      notes: dto.reason,
      performedById: caller.id,
    });

    this.logger.log(`City sheet entry flagged for review: ${entry.citySheetRef ?? id} by ${caller.id}`);
    return CitySheetEntryResponseDto.fromEntity(updated);
  }

  /**
   * Move UNVERIFIED or NEEDS_REVIEW → REJECTED — the candidate is confirmed
   * wrong, defunct, or out of scope, not merely unverified. Also marks the
   * entry INACTIVE so it stops looking usable. Calling verify() later
   * reopens a wrongly-rejected candidate; no separate "reopen" action is
   * needed since verify() already accepts any non-VERIFIED status.
   */
  async reject(
    id: string, dto: RejectCitySheetEntryDto, caller: AuthenticatedUser,
  ): Promise<CitySheetEntryResponseDto> {
    const entry = await this.repo.findById(id);
    if (!entry) throw new NotFoundException(`City sheet entry '${id}' not found`);

    if (entry.verificationStatus === CitySheetVerificationStatus.VERIFIED) {
      throw new ConflictException(
        `City sheet entry is already VERIFIED. Use flag-for-review first if it needs to be reconsidered.`,
      );
    }

    const previousStatus = entry.verificationStatus;
    const updated = await this.repo.update(id, {
      verificationStatus:     CitySheetVerificationStatus.REJECTED,
      verificationConfidence: dto.confidence,
      lastVerifiedAt:         new Date(),
      verifiedById:           caller.id,
      rejectionReason:        dto.reason,
      status:                 CitySheetEntryStatus.INACTIVE,
    });

    await this.repo.appendVerificationEvent({
      citySheetEntryId: id,
      eventType: CitySheetVerificationEventType.REJECTED,
      previousStatus,
      newStatus: CitySheetVerificationStatus.REJECTED,
      confidence: dto.confidence,
      notes: dto.reason,
      checklistResponses: toChecklistRecords(dto.checklistResponses),
      performedById: caller.id,
    });

    this.logger.log(`City sheet entry rejected: ${entry.citySheetRef ?? id} by ${caller.id}`);
    return CitySheetEntryResponseDto.fromEntity(updated);
  }
}

function toChecklistRecords(
  responses: { itemId: string; label: string; confirmed: boolean; note?: string }[] | undefined,
): ChecklistResponseRecord[] | undefined {
  return responses?.map((r) => ({ itemId: r.itemId, label: r.label, confirmed: r.confirmed, note: r.note }));
}
