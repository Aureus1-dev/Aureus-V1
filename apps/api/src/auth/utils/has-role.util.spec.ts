import { UserRole } from '@prisma/client';
import { hasRole } from './has-role.util';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

describe('hasRole', () => {
  it('returns true when the caller holds one of the given roles', () => {
    const caller: AuthenticatedUser = { id: 'u1', email: 'a@b.com', roles: [UserRole.STEWARD] };
    expect(hasRole(caller, [UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR])).toBe(true);
  });

  it('returns false when the caller holds none of the given roles', () => {
    const caller: AuthenticatedUser = { id: 'u1', email: 'a@b.com', roles: [UserRole.MEMBER] };
    expect(hasRole(caller, [UserRole.PLATFORM_ADMINISTRATOR])).toBe(false);
  });

  it('returns false for a caller with no roles', () => {
    const caller: AuthenticatedUser = { id: 'u1', email: 'a@b.com', roles: [] };
    expect(hasRole(caller, [UserRole.MEMBER])).toBe(false);
  });
});
