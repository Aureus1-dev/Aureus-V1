import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UserResponseDto } from '../users/dto/user-response.dto';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../users/repositories/user.repository.interface';

/**
 * MEMBER is the baseline role every account holds (assigned at registration)
 * and is never grantable or revocable through this endpoint — it is not a
 * privilege, it is the floor.
 */
const PROTECTED_ROLE = UserRole.MEMBER;

/**
 * Elevating a user to PLATFORM_ADMINISTRATOR, SYSTEM_ADMINISTRATOR, or
 * AI_SERVICE_ACCOUNT requires a System Administrator (PA-018 — least
 * privilege, separation of duties). A Platform Administrator may grant or
 * revoke any other non-baseline role — enforced by RolesGuard restricting
 * this controller to PLATFORM_ADMINISTRATOR/SYSTEM_ADMINISTRATOR callers,
 * combined with the check below for this highest-privilege subset.
 */
const SYSTEM_ADMIN_ONLY_ROLES: UserRole[] = [
  UserRole.PLATFORM_ADMINISTRATOR,
  UserRole.SYSTEM_ADMINISTRATOR,
  UserRole.AI_SERVICE_ACCOUNT,
];

@Injectable()
export class UserRolesService {
  private readonly logger = new Logger(UserRolesService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {}

  async grant(
    targetUserId: string,
    role: UserRole,
    caller: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    this.assertMutable(role, targetUserId, caller);

    const target = await this.users.findById(targetUserId);
    if (!target) throw new NotFoundException(`User '${targetUserId}' not found`);

    if (target.roles.includes(role)) {
      throw new ConflictException(`User already holds the '${role}' role`);
    }

    const updated = await this.users.update(targetUserId, {
      roles: [...target.roles, role],
    });

    this.logger.log(`Role ${role} granted to ${targetUserId} by ${caller.id}`);
    return UserResponseDto.fromEntity(updated);
  }

  async revoke(
    targetUserId: string,
    role: UserRole,
    caller: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    this.assertMutable(role, targetUserId, caller);

    const target = await this.users.findById(targetUserId);
    if (!target) throw new NotFoundException(`User '${targetUserId}' not found`);

    if (!target.roles.includes(role)) {
      throw new ConflictException(`User does not hold the '${role}' role`);
    }

    const remainingRoles = target.roles.filter((r) => r !== role);
    if (remainingRoles.length === 0) {
      throw new ConflictException(
        'Cannot revoke the user\'s last remaining role — grant a replacement role first',
      );
    }

    const updated = await this.users.update(targetUserId, { roles: remainingRoles });

    this.logger.log(`Role ${role} revoked from ${targetUserId} by ${caller.id}`);
    return UserResponseDto.fromEntity(updated);
  }

  /**
   * Shared invariants for both grant and revoke:
   *  - MEMBER can never be targeted (it is the protected baseline role).
   *  - Callers may not modify their own roles (prevents accidental
   *    self-lockout and self-escalation — OAS-SEC-003 separation of duties).
   *  - Only a System Administrator may assign/remove the highest-privilege
   *    roles (PA-018 least privilege).
   */
  private assertMutable(role: UserRole, targetUserId: string, caller: AuthenticatedUser): void {
    if (role === PROTECTED_ROLE) {
      throw new ConflictException(
        `'${PROTECTED_ROLE}' is the baseline role and cannot be granted or revoked directly`,
      );
    }

    if (caller.id === targetUserId) {
      throw new ForbiddenException('Administrators may not modify their own roles');
    }

    const isSystemAdmin = caller.roles.includes(UserRole.SYSTEM_ADMINISTRATOR);
    if (SYSTEM_ADMIN_ONLY_ROLES.includes(role) && !isSystemAdmin) {
      throw new ForbiddenException(`Only a System Administrator may assign the '${role}' role`);
    }
  }
}
