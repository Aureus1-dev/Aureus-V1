/**
 * Step 5 — which controls an organization role may see.
 *
 * These sets mirror `BusinessResponsibilitiesService`'s `WORK_ROLES` and
 * `MANAGE_ROLES` exactly. The server remains the authority: hiding a button
 * is a courtesy so a member is not offered an action that would 403, never
 * the enforcement itself. No UI control may manufacture authority, so this
 * file only ever *removes* affordances.
 */

export type OrganizationMemberRole =
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'OPERATOR'
  | 'VIEWER'
  | 'MEMBER';

/** May move work between open states (needs-you / resume). */
const WORK_ROLES: ReadonlySet<string> = new Set(['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR']);

/** May confirm completion or cancel. Deliberately excludes OPERATOR. */
const MANAGE_ROLES: ReadonlySet<string> = new Set(['OWNER', 'ADMIN', 'MANAGER']);

export interface OwnerCapabilities {
  /** Can flag a responsibility as needing the business, or resume it. */
  canChangeWorkState: boolean;
  /** Can confirm completion or cancel a responsibility. */
  canManageCompletion: boolean;
}

export function capabilitiesForRole(role: string | null | undefined): OwnerCapabilities {
  if (!role) return { canChangeWorkState: false, canManageCompletion: false };
  return {
    canChangeWorkState: WORK_ROLES.has(role),
    canManageCompletion: MANAGE_ROLES.has(role),
  };
}
