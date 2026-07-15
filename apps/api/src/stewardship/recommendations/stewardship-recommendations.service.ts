import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { StewardshipRecommendationType } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/stewardship-roles.util';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { RecommendationResponseDto } from './dto/recommendation-response.dto';
import {
  IStewardshipRecommendationRepository,
  STEWARDSHIP_RECOMMENDATION_REPOSITORY,
} from './repositories/stewardship-recommendation.repository.interface';
import {
  IStewardshipRelationshipRepository,
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
} from '../relationships/repositories/stewardship-relationship.repository.interface';
import { OpportunitiesService } from '../../opportunities/opportunities.service';
import { ResourcesService } from '../../resources/resources.service';

@Injectable()
export class StewardshipRecommendationsService {
  constructor(
    @Inject(STEWARDSHIP_RECOMMENDATION_REPOSITORY) private readonly repo: IStewardshipRecommendationRepository,
    @Inject(STEWARDSHIP_RELATIONSHIP_REPOSITORY) private readonly relationshipRepo: IStewardshipRelationshipRepository,
    private readonly opportunitiesService: OpportunitiesService,
    private readonly resourcesService: ResourcesService,
  ) {}

  async create(
    relationshipId: string, dto: CreateRecommendationDto, caller: AuthenticatedUser,
  ): Promise<RecommendationResponseDto> {
    const relationship = await this.getRelationshipOrThrow(relationshipId);
    this.assertIsStewardOrAdmin(relationship.stewardId, caller);
    await this.assertValidTarget(dto);

    const recommendation = await this.repo.create({
      relationshipId,
      type: dto.type,
      opportunityId: dto.type === StewardshipRecommendationType.OPPORTUNITY ? dto.opportunityId : undefined,
      resourceId: dto.type === StewardshipRecommendationType.RESOURCE ? dto.resourceId : undefined,
      note: dto.note,
      createdById: caller.id,
    });
    return RecommendationResponseDto.fromEntity(recommendation);
  }

  async findByRelationship(relationshipId: string, caller: AuthenticatedUser): Promise<RecommendationResponseDto[]> {
    const relationship = await this.getRelationshipOrThrow(relationshipId);
    const isAdmin = hasRole(caller, PLATFORM_ADMIN_ROLES);
    const isParty = caller.id === relationship.memberId || caller.id === relationship.stewardId;
    if (!isAdmin && !isParty) {
      throw new ForbiddenException('You do not have permission to view these recommendations');
    }

    const recommendations = await this.repo.findByRelationship(relationshipId);
    return recommendations.map(RecommendationResponseDto.fromEntity);
  }

  private async assertValidTarget(dto: CreateRecommendationDto): Promise<void> {
    if (dto.type === StewardshipRecommendationType.OPPORTUNITY) {
      if (!dto.opportunityId) throw new BadRequestException('opportunityId is required when type is OPPORTUNITY');
      await this.opportunitiesService.findById(dto.opportunityId);
    } else {
      if (!dto.resourceId) throw new BadRequestException('resourceId is required when type is RESOURCE');
      await this.resourcesService.findById(dto.resourceId);
    }
  }

  private async getRelationshipOrThrow(relationshipId: string) {
    const relationship = await this.relationshipRepo.findById(relationshipId);
    if (!relationship) throw new NotFoundException(`Stewardship relationship '${relationshipId}' not found`);
    return relationship;
  }

  private assertIsStewardOrAdmin(stewardId: string | null, caller: AuthenticatedUser): void {
    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return;
    if (stewardId === caller.id) return;
    throw new ForbiddenException('Only the assigned steward may create recommendations on this relationship');
  }
}
