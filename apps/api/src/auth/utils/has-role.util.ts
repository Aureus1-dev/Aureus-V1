import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../strategies/jwt.strategy';

/** True if the caller holds at least one of the given roles. */
export function hasRole(caller: AuthenticatedUser, roles: UserRole[]): boolean {
  return caller.roles.some((role) => roles.includes(role as UserRole));
}
