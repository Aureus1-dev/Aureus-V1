import { UserRole } from '@prisma/client';

/**
 * Shared within the Communication domain only (mirrors Stewardship's local
 * `PLATFORM_ADMIN_ROLES` convention, ADR-011) — reused here because every
 * sub-module in this domain needs the identical platform-admin-override
 * check.
 */
export const PLATFORM_ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];
