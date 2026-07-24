import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CitySheetCategory, CitySheetEntryStatus, CitySheetVerificationStatus, UserRole } from '@prisma/client';
import { CitySheetService } from '../city-sheet/city-sheet.service';
import { UsersService } from '../users/users.service';
import { StatedNeedResponseDto } from './dto/stated-need-response.dto';
import { MatchedResourceDto } from './dto/matched-resource.dto';
import { ResourceOfferResponseDto } from './dto/resource-offer-response.dto';
import { SafeFailureResponseDto } from './dto/safe-failure-response.dto';
import { IStatedNeedRepository, STATED_NEED_REPOSITORY } from './repositories/stated-need.repository.interface';
import { IResourceOfferRepository, RESOURCE_OFFER_REPOSITORY } from './repositories/resource-offer.repository.interface';
import {
  IUnresolvedNeedRepository,
  UNRESOLVED_NEED_REPOSITORY,
} from './repositories/unresolved-need.repository.interface';
import { matchCategoriesForNeed } from './resource-matching.util';
import { NO_VERIFIED_RESOURCE_NO_STEWARD_REASON, SAFE_FAILURE_MESSAGE, SAFE_FAILURE_NEXT_STEP } from './safe-failure.util';

/**
 * Gate C (C1: Understanding). Captures a member's stated need — the first
 * user message of a conversation, taken in exactly as the member wrote it,
 * with no menu navigation involved. This is the entry point the rest of the
 * Clearing (C2 clarification, C3 urgency, C4 resource discovery, ...) reads
 * from; it does not itself interpret or classify the content.
 */
@Injectable()
export class NeedsService {
  constructor(
    @Inject(STATED_NEED_REPOSITORY) private readonly repo: IStatedNeedRepository,
    @Inject(RESOURCE_OFFER_REPOSITORY) private readonly offers: IResourceOfferRepository,
    @Inject(UNRESOLVED_NEED_REPOSITORY) private readonly unresolvedNeeds: IUnresolvedNeedRepository,
    private readonly citySheet: CitySheetService,
    private readonly users: UsersService,
  ) {}

  async capture(userId: string, conversationId: string, content: string): Promise<StatedNeedResponseDto> {
    const created = await this.repo.create({ userId, conversationId, content });
    return StatedNeedResponseDto.fromEntity(created);
  }

  async findMine(userId: string): Promise<StatedNeedResponseDto[]> {
    const needs = await this.repo.findAllByUser(userId);
    return needs.map(StatedNeedResponseDto.fromEntity);
  }

  /**
   * Gate C (C4: Resource discovery). Retrieves active City Sheet candidates
   * whose category deterministically matches this stated need's own words
   * (see `resource-matching.util.ts`). Self-only — a need's owner is the
   * only caller who may see resources matched for it.
   */
  async findMatchingResources(needId: string, callerId: string): Promise<MatchedResourceDto[]> {
    const need = await this.getOwnedNeedOrThrow(needId, callerId);

    const categories = matchCategoriesForNeed(need.content);
    if (categories.length === 0) return [];

    const resultsByCategory = await Promise.all(
      categories.map((category: CitySheetCategory) =>
        this.citySheet.findAll({ page: 1, limit: 50, category, status: CitySheetEntryStatus.ACTIVE }),
      ),
    );

    const seen = new Set<string>();
    const matched: MatchedResourceDto[] = [];
    for (const result of resultsByCategory) {
      for (const entry of result.data) {
        if (seen.has(entry.id)) continue;
        seen.add(entry.id);
        matched.push(MatchedResourceDto.fromEntity(entry));
      }
    }
    return matched;
  }

  /**
   * Gate C (C5: Verified resource presentation). Records that a matched
   * resource was actually offered to a member — "every offer made... is
   * recorded" per the acceptance criteria. A fresh row is created each time
   * (no upsert), so re-offering the same resource is never silently merged
   * into or mistaken for an earlier decision.
   */
  async offerResource(needId: string, citySheetEntryId: string, callerId: string): Promise<ResourceOfferResponseDto> {
    const need = await this.getOwnedNeedOrThrow(needId, callerId);
    await this.citySheet.findById(citySheetEntryId); // throws NotFoundException if missing

    const created = await this.offers.create({ userId: callerId, statedNeedId: need.id, citySheetEntryId });
    return ResourceOfferResponseDto.fromEntity(created);
  }

  /**
   * Gate C (C5). Records the member's acceptance or refusal against the
   * most recent pending offer for this need/resource pair — "the member's
   * acceptance or refusal of it, is recorded."
   */
  async respondToOffer(
    needId: string, citySheetEntryId: string, accepted: boolean, callerId: string,
  ): Promise<ResourceOfferResponseDto> {
    const need = await this.getOwnedNeedOrThrow(needId, callerId);

    const pending = await this.offers.findMostRecentPending(need.id, citySheetEntryId);
    if (!pending) throw new NotFoundException('No pending offer found for this resource');

    const updated = await this.offers.respond(pending.id, accepted);
    return ResourceOfferResponseDto.fromEntity(updated);
  }

  /** Gate C (C5). Every offer-and-response for a stated need, retrievable by its owner. */
  async findOffers(needId: string, callerId: string): Promise<ResourceOfferResponseDto[]> {
    const need = await this.getOwnedNeedOrThrow(needId, callerId);
    const rows = await this.offers.findAllByStatedNeed(need.id);
    return rows.map(ResourceOfferResponseDto.fromEntity);
  }

  /**
   * Gate C (C7: Safe failure). Honestly checks whether this stated need
   * currently has neither a verified City Sheet resource nor a reachable
   * steward — the one condition where a member could otherwise be left at
   * a dead end. If triggered, the outcome is recorded exactly once (a
   * repeat check on an already-recorded need returns the same row, never a
   * duplicate) so it stays retrievable evidence the need was seen. Never
   * triggers on ambiguous input: an unmatched need (no category at all) is
   * C4's "no keyword hit," not this work order's concern.
   */
  async checkSafeFailure(needId: string, callerId: string): Promise<SafeFailureResponseDto> {
    const need = await this.getOwnedNeedOrThrow(needId, callerId);

    const categories = matchCategoriesForNeed(need.content);
    const hasVerifiedResource = await this.hasVerifiedResourceFor(categories);
    const stewardReachable = await this.isStewardReachable();

    if (categories.length === 0 || hasVerifiedResource || stewardReachable) {
      return SafeFailureResponseDto.notTriggered();
    }

    const existing = await this.unresolvedNeeds.findByStatedNeed(need.id);
    const record = existing
      ?? (await this.unresolvedNeeds.create({
        userId: callerId,
        statedNeedId: need.id,
        reason: NO_VERIFIED_RESOURCE_NO_STEWARD_REASON,
        message: SAFE_FAILURE_MESSAGE,
      }));
    return SafeFailureResponseDto.fromEntity(record, SAFE_FAILURE_NEXT_STEP);
  }

  private async hasVerifiedResourceFor(categories: CitySheetCategory[]): Promise<boolean> {
    if (categories.length === 0) return false;
    const resultsByCategory = await Promise.all(
      categories.map((category) =>
        this.citySheet.findAll({
          page: 1, limit: 1, category, status: CitySheetEntryStatus.ACTIVE,
          verificationStatus: CitySheetVerificationStatus.VERIFIED,
        }),
      ),
    );
    return resultsByCategory.some((result) => result.data.length > 0);
  }

  private async isStewardReachable(): Promise<boolean> {
    const [stewards, admins] = await Promise.all([
      this.users.findAll({ page: 1, limit: 1, role: UserRole.STEWARD }),
      this.users.findAll({ page: 1, limit: 1, role: UserRole.PLATFORM_ADMINISTRATOR }),
    ]);
    return stewards.total > 0 || admins.total > 0;
  }

  private async getOwnedNeedOrThrow(needId: string, callerId: string) {
    const need = await this.repo.findById(needId);
    if (!need) throw new NotFoundException(`Stated need '${needId}' not found`);
    if (need.userId !== callerId) throw new ForbiddenException('You may only act on your own stated needs');
    return need;
  }
}
