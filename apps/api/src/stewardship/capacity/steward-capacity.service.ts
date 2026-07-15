import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from '../common/stewardship-roles.util';
import { CapacityResponseDto } from './dto/capacity-response.dto';
import { IStewardCapacityRepository, STEWARD_CAPACITY_REPOSITORY } from './repositories/steward-capacity.repository.interface';

@Injectable()
export class StewardCapacityService {
  constructor(@Inject(STEWARD_CAPACITY_REPOSITORY) private readonly repo: IStewardCapacityRepository) {}

  async findByStewardId(stewardId: string, caller: AuthenticatedUser): Promise<CapacityResponseDto> {
    this.assertSelfOrAdmin(stewardId, caller);
    const capacity = await this.repo.findOrCreate(stewardId, caller.id);
    return CapacityResponseDto.fromEntity(capacity);
  }

  async update(stewardId: string, maxActiveMembers: number, caller: AuthenticatedUser): Promise<CapacityResponseDto> {
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('Only a Platform/System Administrator may change a steward\'s capacity');
    }
    const capacity = await this.repo.update(stewardId, maxActiveMembers, caller.id);
    return CapacityResponseDto.fromEntity(capacity);
  }

  private assertSelfOrAdmin(stewardId: string, caller: AuthenticatedUser): void {
    if (caller.id === stewardId) return;
    if (!hasRole(caller, PLATFORM_ADMIN_ROLES)) {
      throw new ForbiddenException('You may only view your own capacity');
    }
  }
}
