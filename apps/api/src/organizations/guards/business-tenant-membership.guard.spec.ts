import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { OrganizationType, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { PrismaService } from '../../prisma/prisma.service';
import { BusinessTenantMembershipGuard } from './business-tenant-membership.guard';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';

const caller = (roles: UserRole[] = [UserRole.BUSINESS_REPRESENTATIVE]): AuthenticatedUser => ({
  id: USER_ID,
  email: 'business@example.com',
  roles,
});

const context = (user: AuthenticatedUser | undefined, organizationId = TENANT_ID) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ params: { organizationId }, user }),
    }),
  }) as unknown as ExecutionContext;

describe('BusinessTenantMembershipGuard', () => {
  const db = {
    organization: { findFirst: jest.fn() },
  };
  let guard: BusinessTenantMembershipGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new BusinessTenantMembershipGuard({ db } as unknown as PrismaService);
  });

  it('allows a caller only when the requested business tenant contains that exact member', async () => {
    db.organization.findFirst.mockResolvedValue({ id: TENANT_ID });

    await expect(guard.canActivate(context(caller()))).resolves.toBe(true);
    expect(db.organization.findFirst).toHaveBeenCalledWith({
      where: {
        id: TENANT_ID,
        deletedAt: null,
        organizationType: OrganizationType.BUSINESS,
        members: { some: { userId: USER_ID } },
      },
      select: { id: true },
    });
  });

  it('conceals a tenant from an ordinary authenticated non-member', async () => {
    db.organization.findFirst.mockResolvedValue(null);
    await expect(guard.canActivate(context(caller([UserRole.MEMBER])))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('does not let a global Steward role become implicit cross-tenant access', async () => {
    db.organization.findFirst.mockResolvedValue(null);
    await expect(guard.canActivate(context(caller([UserRole.STEWARD])))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('does not let platform or system administrator roles become implicit cross-tenant access', async () => {
    db.organization.findFirst.mockResolvedValue(null);

    await expect(
      guard.canActivate(context(caller([UserRole.PLATFORM_ADMINISTRATOR]))),
    ).rejects.toThrow(NotFoundException);
    await expect(
      guard.canActivate(context(caller([UserRole.SYSTEM_ADMINISTRATOR]))),
    ).rejects.toThrow(NotFoundException);
  });

  it('fails closed before data access when authenticated identity is missing', async () => {
    await expect(guard.canActivate(context(undefined))).rejects.toThrow(NotFoundException);
    expect(db.organization.findFirst).not.toHaveBeenCalled();
  });
});
