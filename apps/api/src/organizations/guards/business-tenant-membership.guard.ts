import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationType } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

interface BusinessTenantRequest {
  params?: { organizationId?: string };
  user?: AuthenticatedUser;
}

@Injectable()
export class BusinessTenantMembershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<BusinessTenantRequest>();
    const organizationId = request.params?.organizationId;
    const userId = request.user?.id;

    if (!organizationId || !userId) {
      throw new NotFoundException(`Organization '${organizationId ?? ''}' not found`);
    }

    const tenant = await this.prisma.db.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
        organizationType: OrganizationType.BUSINESS,
        members: { some: { userId } },
      },
      select: { id: true },
    });

    if (!tenant) {
      // Deliberately indistinguishable from an absent tenant. Global Aureus
      // roles do not create implicit access to a business's operational data.
      throw new NotFoundException(`Organization '${organizationId}' not found`);
    }

    return true;
  }
}
