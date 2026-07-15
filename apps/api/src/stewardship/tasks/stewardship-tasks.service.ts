import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/stewardship-roles.util';
import { CreateStewardshipTaskDto } from './dto/create-stewardship-task.dto';
import { UpdateStewardshipTaskDto } from './dto/update-stewardship-task.dto';
import { StewardshipTaskResponseDto } from './dto/stewardship-task-response.dto';
import { IStewardshipTaskRepository, STEWARDSHIP_TASK_REPOSITORY } from './repositories/stewardship-task.repository.interface';
import {
  IStewardshipRelationshipRepository,
  STEWARDSHIP_RELATIONSHIP_REPOSITORY,
} from '../relationships/repositories/stewardship-relationship.repository.interface';

@Injectable()
export class StewardshipTasksService {
  constructor(
    @Inject(STEWARDSHIP_TASK_REPOSITORY) private readonly repo: IStewardshipTaskRepository,
    @Inject(STEWARDSHIP_RELATIONSHIP_REPOSITORY) private readonly relationshipRepo: IStewardshipRelationshipRepository,
  ) {}

  async create(
    relationshipId: string, dto: CreateStewardshipTaskDto, caller: AuthenticatedUser,
  ): Promise<StewardshipTaskResponseDto> {
    const relationship = await this.getRelationshipOrThrow(relationshipId);
    this.assertIsStewardOrAdmin(relationship.stewardId, caller);

    const task = await this.repo.create({
      relationshipId,
      title: dto.title,
      description: dto.description,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      createdById: caller.id,
    });
    return StewardshipTaskResponseDto.fromEntity(task);
  }

  async findByRelationship(relationshipId: string, caller: AuthenticatedUser): Promise<StewardshipTaskResponseDto[]> {
    const relationship = await this.getRelationshipOrThrow(relationshipId);
    this.assertIsVisible(relationship, caller);

    const tasks = await this.repo.findByRelationship(relationshipId);
    return tasks.map(StewardshipTaskResponseDto.fromEntity);
  }

  async update(
    id: string, dto: UpdateStewardshipTaskDto, caller: AuthenticatedUser,
  ): Promise<StewardshipTaskResponseDto> {
    const task = await this.repo.findById(id);
    if (!task) throw new NotFoundException(`Stewardship task '${id}' not found`);

    const relationship = await this.getRelationshipOrThrow(task.relationshipId);
    this.assertIsStewardOrAdmin(relationship.stewardId, caller);

    const updated = await this.repo.update(id, {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
    return StewardshipTaskResponseDto.fromEntity(updated);
  }

  private async getRelationshipOrThrow(relationshipId: string) {
    const relationship = await this.relationshipRepo.findById(relationshipId);
    if (!relationship) throw new NotFoundException(`Stewardship relationship '${relationshipId}' not found`);
    return relationship;
  }

  private assertIsStewardOrAdmin(stewardId: string | null, caller: AuthenticatedUser): void {
    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return;
    if (stewardId === caller.id) return;
    throw new ForbiddenException('Only the assigned steward may manage follow-up tasks on this relationship');
  }

  private assertIsVisible(
    relationship: { memberId: string; stewardId: string | null }, caller: AuthenticatedUser,
  ): void {
    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return;
    if (caller.id === relationship.memberId || caller.id === relationship.stewardId) return;
    throw new ForbiddenException('You do not have permission to view these tasks');
  }
}
