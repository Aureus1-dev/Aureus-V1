import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { StewardshipEscalationStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/stewardship-roles.util';
import { CreateEscalationDto } from './dto/create-escalation.dto';
import { UpdateEscalationStatusDto } from './dto/update-escalation-status.dto';
import { ResolveEscalationDto } from './dto/resolve-escalation.dto';
import { EscalationResponseDto } from './dto/escalation-response.dto';
import {
  IStewardshipEscalationRepository,
  STEWARDSHIP_ESCALATION_REPOSITORY,
} from './repositories/stewardship-escalation.repository.interface';
import {
  IStewardshipRelationshipRepository,
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
} from '../relationships/repositories/stewardship-relationship.repository.interface';

@Injectable()
export class StewardshipEscalationsService {
  constructor(
    @Inject(STEWARDSHIP_ESCALATION_REPOSITORY) private readonly repo: IStewardshipEscalationRepository,
    @Inject(STEWARDSHIP_RELATIONSHIP_REPOSITORY) private readonly relationshipRepo: IStewardshipRelationshipRepository,
  ) {}

  // Escalations are an internal accountability record (PA-012 Steward
  // Authority) — never exposed to the member, unlike notes/tasks/recommendations.

  async create(
    relationshipId: string, dto: CreateEscalationDto, caller: AuthenticatedUser,
  ): Promise<EscalationResponseDto> {
    const relationship = await this.getRelationshipOrThrow(relationshipId);
    this.assertIsStewardOrAdmin(relationship.stewardId, caller);

    const escalation = await this.repo.create({
      relationshipId,
      title: dto.title,
      description: dto.description,
      severity: dto.severity,
      raisedById: caller.id,
    });
    return EscalationResponseDto.fromEntity(escalation);
  }

  async findByRelationship(relationshipId: string, caller: AuthenticatedUser): Promise<EscalationResponseDto[]> {
    const relationship = await this.getRelationshipOrThrow(relationshipId);
    this.assertIsStewardOrAdmin(relationship.stewardId, caller);

    const escalations = await this.repo.findByRelationship(relationshipId);
    return escalations.map(EscalationResponseDto.fromEntity);
  }

  async updateStatus(
    id: string, dto: UpdateEscalationStatusDto, caller: AuthenticatedUser,
  ): Promise<EscalationResponseDto> {
    const escalation = await this.getEscalationOrThrow(id);
    const relationship = await this.getRelationshipOrThrow(escalation.relationshipId);
    this.assertIsStewardOrAdmin(relationship.stewardId, caller);

    const updated = await this.repo.update(id, { status: dto.status });
    return EscalationResponseDto.fromEntity(updated);
  }

  async resolve(id: string, dto: ResolveEscalationDto, caller: AuthenticatedUser): Promise<EscalationResponseDto> {
    const escalation = await this.getEscalationOrThrow(id);
    const relationship = await this.getRelationshipOrThrow(escalation.relationshipId);
    this.assertIsStewardOrAdmin(relationship.stewardId, caller);

    if (escalation.status === StewardshipEscalationStatus.RESOLVED || escalation.status === StewardshipEscalationStatus.CLOSED) {
      throw new ConflictException('This escalation has already been resolved or closed');
    }

    const updated = await this.repo.update(id, {
      status: StewardshipEscalationStatus.RESOLVED,
      resolvedById: caller.id,
      resolutionNotes: dto.resolutionNotes,
      resolvedAt: new Date(),
    });
    return EscalationResponseDto.fromEntity(updated);
  }

  private async getEscalationOrThrow(id: string) {
    const escalation = await this.repo.findById(id);
    if (!escalation) throw new NotFoundException(`Escalation '${id}' not found`);
    return escalation;
  }

  private async getRelationshipOrThrow(relationshipId: string) {
    const relationship = await this.relationshipRepo.findById(relationshipId);
    if (!relationship) throw new NotFoundException(`Stewardship relationship '${relationshipId}' not found`);
    return relationship;
  }

  private assertIsStewardOrAdmin(stewardId: string | null, caller: AuthenticatedUser): void {
    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return;
    if (stewardId === caller.id) return;
    throw new ForbiddenException('Only the assigned steward may manage escalations on this relationship');
  }
}
