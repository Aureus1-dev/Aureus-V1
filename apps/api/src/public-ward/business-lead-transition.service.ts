import { ConflictException, Injectable } from '@nestjs/common';
import {
  Prisma,
  ResponsibilityContextType,
  ResponsibilityKind,
  WardLeadStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import {
  REVENUE_RESPONSIBILITY_PREFIX,
  revenueResponsibilityRequestKey,
} from './business-revenue-completion';
import { TransitionWardLeadDto } from './dto/transition-ward-lead.dto';
import { WardLeadService } from './ward-lead.service';

const TERMINAL = new Set<WardLeadStatus>([WardLeadStatus.CLOSED, WardLeadStatus.LOST]);

/**
 * Preserves the legacy WardLead status endpoint while preventing it from
 * bypassing OR-004 after revenue completion has begun.
 *
 * Terminal legacy transitions take the same advisory transaction lock used by
 * BusinessRevenueCompletionService. The lock is held while the existing
 * WardLeadService performs its already-governed transition. A concurrent
 * revenue-start request therefore cannot appear between our check and the
 * legacy close/loss write.
 */
@Injectable()
export class BusinessLeadTransitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leads: WardLeadService,
  ) {}

  async transition(
    organizationId: string,
    leadId: string,
    dto: TransitionWardLeadDto,
    caller: AuthenticatedUser,
  ) {
    if (!TERMINAL.has(dto.status)) {
      return this.leads.transitionBusinessLead(organizationId, leadId, dto, caller);
    }

    return this.prisma.db.$transaction(async (tx) => {
      const lockKey = `${REVENUE_RESPONSIBILITY_PREFIX}:${organizationId}:${leadId}`;
      await tx.$executeRaw(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
      );

      const requestKey = revenueResponsibilityRequestKey(leadId);
      const revenueResponsibility = await tx.responsibility.findFirst({
        where: {
          contextType: ResponsibilityContextType.BUSINESS_TENANT,
          principalOrganizationId: organizationId,
          kind: ResponsibilityKind.BUSINESS_PROMISE,
          successCriteria: { path: ['requestKey'], equals: requestKey },
        },
        select: { id: true },
      });

      if (revenueResponsibility) {
        throw new ConflictException(
          'Revenue completion has started. Record the terminal sales outcome through Revenue Completion.',
        );
      }

      // This call uses the pre-existing transition transaction/authority rules.
      // The outer advisory lock remains held until it returns and this wrapper
      // transaction commits, so a concurrent OR-004 start cannot interleave.
      return this.leads.transitionBusinessLead(organizationId, leadId, dto, caller);
    });
  }
}
