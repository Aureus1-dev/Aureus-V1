import { UserRole } from '@prisma/client';

/** Shared within the Pods domain only, mirroring every sibling domain's local-constant convention. */
export const PLATFORM_ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

/** Platform-wide Steward role — distinct from `PodMembership.role = STEWARD`, a per-Pod servant-leadership role (§4). */
export const CREATOR_ROLES: UserRole[] = [UserRole.STEWARD, UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];
