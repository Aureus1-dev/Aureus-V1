import { NotFoundException } from '@nestjs/common';
import { UserRole, VerificationStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

/**
 * Public marketplace domains (Resources, Organizations, Opportunities,
 * Academy Courses/Learning Paths, Knowledge) default their `findAll` listing
 * to VERIFIED-only for the general audience — but their direct `findById`/
 * `findByRef` lookups previously skipped that same default, letting anyone
 * who merely knew or guessed a UUID or a sequential human-readable ref read
 * DRAFT/PENDING_REVIEW/REJECTED content (PD-001).
 *
 * This is a controller-boundary check, not a service-layer one: each
 * domain's `findById`/`findByRef` service method stays unrestricted, because
 * it's also called internally (course-authoring flows, AI insights,
 * institutional memory, Steward recommendation validation) where the
 * content's moderation status is irrelevant and a caller is never available.
 * Only the public HTTP GET path — where `caller` reflects the real,
 * possibly-anonymous requester — enforces this.
 */
export function assertContentVisible(
  verificationStatus: VerificationStatus,
  caller: AuthenticatedUser | undefined,
  privilegedRoles: UserRole[],
  notFoundMessage: string,
): void {
  if (verificationStatus === VerificationStatus.VERIFIED) return;
  if (caller && caller.roles.some((role) => privilegedRoles.includes(role as UserRole))) return;
  throw new NotFoundException(notFoundMessage);
}
