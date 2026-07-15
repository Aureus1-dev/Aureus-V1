import { UserRole } from '@prisma/client';

/**
 * Shared within the Stewardship domain only (mirrors the rest of the
 * codebase's convention of local, not global, role constants) — reused here
 * because six sibling sub-modules within this one domain need the identical
 * platform-admin-override check, unlike the cross-domain case WO-022
 * deliberately left un-shared.
 */
export const PLATFORM_ADMIN_ROLES: UserRole[] = [UserRole.PLATFORM_ADMINISTRATOR, UserRole.SYSTEM_ADMINISTRATOR];
