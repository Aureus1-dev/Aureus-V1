import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole, Journey } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { hasRole } from '../auth/utils/has-role.util';
import { CreateJourneyDto } from './dto/create-journey.dto';
import { UpdateJourneyDto } from './dto/update-journey.dto';
import { JourneyResponseDto } from './dto/journey-response.dto';
import { JOURNEY_REPOSITORY, IJourneyRepository } from './repositories/journey.repository.interface';
import { GOAL_REPOSITORY, IGoalRepository } from '../goals/repositories/goal.repository.interface';

const ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

@Injectable()
export class JourneysService {
  constructor(
    @Inject(JOURNEY_REPOSITORY) private readonly repo: IJourneyRepository,
    @Inject(GOAL_REPOSITORY) private readonly goalRepo: IGoalRepository,
  ) {}

  async create(dto: CreateJourneyDto, caller: AuthenticatedUser): Promise<JourneyResponseDto> {
    await this.assertOwnsGoal(dto.goalId, caller);
    const existing = await this.repo.findByGoalId(dto.goalId);
    if (existing) throw new ConflictException(`Goal '${dto.goalId}' already has a Journey`);
    return JourneyResponseDto.fromEntity(await this.repo.create(dto));
  }

  async findById(id: string, caller: AuthenticatedUser): Promise<JourneyResponseDto> {
    const journey = await this.getOwnedOrThrow(id, caller);
    return JourneyResponseDto.fromEntity(journey);
  }

  async findByGoalId(goalId: string, caller: AuthenticatedUser): Promise<JourneyResponseDto> {
    await this.assertOwnsGoal(goalId, caller);
    const j = await this.repo.findByGoalId(goalId);
    if (!j) throw new NotFoundException(`No Journey found for Goal '${goalId}'`);
    return JourneyResponseDto.fromEntity(j);
  }

  async update(id: string, dto: UpdateJourneyDto, caller: AuthenticatedUser): Promise<JourneyResponseDto> {
    await this.getOwnedOrThrow(id, caller);
    return JourneyResponseDto.fromEntity(await this.repo.update(id, dto));
  }

  async remove(id: string, caller: AuthenticatedUser): Promise<void> {
    await this.getOwnedOrThrow(id, caller);
    await this.repo.softDelete(id);
  }

  private async assertOwnsGoal(goalId: string, caller: AuthenticatedUser): Promise<void> {
    const goal = await this.goalRepo.findById(goalId);
    if (!goal) throw new NotFoundException(`Goal '${goalId}' not found`);
    if (goal.userId !== caller.id && !hasRole(caller, ADMIN_ROLES)) {
      throw new ForbiddenException('You do not have permission to act on this goal');
    }
  }

  private async getOwnedOrThrow(id: string, caller: AuthenticatedUser): Promise<Journey> {
    const journey = await this.repo.findById(id);
    if (!journey) throw new NotFoundException(`Journey '${id}' not found`);
    if (hasRole(caller, ADMIN_ROLES)) return journey;
    const ownerId = await this.repo.findOwnerId(id);
    if (ownerId !== caller.id) {
      throw new ForbiddenException('You do not have permission to access this journey');
    }
    return journey;
  }
}
