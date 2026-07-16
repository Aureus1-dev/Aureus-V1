import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { hasRole } from '../../auth/utils/has-role.util';
import { PLATFORM_ADMIN_ROLES } from './pods-roles.util';
import { IPodMembershipRepository, POD_MEMBERSHIP_REPOSITORY } from '../memberships/repositories/pod-membership.repository.interface';

/**
 * Shared Pod-role authorization checks, used across every Pods sub-domain
 * that needs "is this caller the Pod's Steward (servant-leader), an ACTIVE
 * member, or a Platform Admin" — kept in one place so each of the ten
 * sub-domains does not re-derive the same PodMembership lookup.
 */
@Injectable()
export class PodAuthorizationService {
  constructor(
    @Inject(POD_MEMBERSHIP_REPOSITORY) private readonly membershipRepo: IPodMembershipRepository,
  ) {}

  async assertStewardOrAdmin(podId: string, caller: AuthenticatedUser): Promise<void> {
    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return;
    if (await this.membershipRepo.isActiveSteward(podId, caller.id)) return;
    throw new ForbiddenException('Only this Pod\'s Steward or an Administrator may perform this action');
  }

  async assertActiveMemberOrAdmin(podId: string, caller: AuthenticatedUser): Promise<void> {
    if (hasRole(caller, PLATFORM_ADMIN_ROLES)) return;
    if (await this.membershipRepo.isActiveMember(podId, caller.id)) return;
    throw new ForbiddenException('Only an active member of this Pod or an Administrator may perform this action');
  }

  isAdmin(caller: AuthenticatedUser): boolean {
    return hasRole(caller, PLATFORM_ADMIN_ROLES);
  }
}
