import { UserRole } from '@prisma/client';

export const PLATFORM_ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];

/**
 * Per the founder's canonical WO-026 decision — "Authorized Stewards and
 * Platform Administrators may create, manage, review, and publish Academy
 * and public-facing media content" — Academy content authority is
 * Steward/Admin-only, deliberately narrower than Resources/Knowledge's
 * four-role creator set (which also includes Organization/Business
 * representatives). Used identically for both content creation and
 * verification-workflow moderation (ADR-014 Decision 3).
 */
export const ACADEMY_STAFF_ROLES: UserRole[] = [
  UserRole.STEWARD,
  UserRole.PLATFORM_ADMINISTRATOR,
  UserRole.SYSTEM_ADMINISTRATOR,
];
