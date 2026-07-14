import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SaveOpportunityDto, UpdateSavedOpportunityDto } from './dto/save-opportunity.dto';
import { SavedOpportunityResponseDto } from './dto/saved-opportunity-response.dto';
import {
  ISavedOpportunityRepository,
  SAVED_OPPORTUNITY_REPOSITORY,
} from './repositories/saved-opportunity.repository.interface';

@Injectable()
export class SavedOpportunitiesService {
  constructor(
    @Inject(SAVED_OPPORTUNITY_REPOSITORY)
    private readonly repo: ISavedOpportunityRepository,
  ) {}

  async save(userId: string, dto: SaveOpportunityDto): Promise<SavedOpportunityResponseDto> {
    const existing = await this.repo.findOne(userId, dto.opportunityId);
    if (existing) throw new ConflictException('Opportunity is already saved');

    const saved = await this.repo.save({ userId, ...dto });
    return SavedOpportunityResponseDto.fromEntity(saved);
  }

  async findByUser(userId: string): Promise<SavedOpportunityResponseDto[]> {
    const list = await this.repo.findByUser(userId);
    return list.map(SavedOpportunityResponseDto.fromEntity);
  }

  async update(
    userId: string, opportunityId: string, dto: UpdateSavedOpportunityDto,
  ): Promise<SavedOpportunityResponseDto> {
    const existing = await this.repo.findOne(userId, opportunityId);
    if (!existing) throw new NotFoundException('Saved opportunity not found');

    const updated = await this.repo.update(userId, opportunityId, dto);
    return SavedOpportunityResponseDto.fromEntity(updated);
  }

  async remove(userId: string, opportunityId: string): Promise<void> {
    const existing = await this.repo.findOne(userId, opportunityId);
    if (!existing) throw new NotFoundException('Saved opportunity not found');
    await this.repo.remove(userId, opportunityId);
  }
}
