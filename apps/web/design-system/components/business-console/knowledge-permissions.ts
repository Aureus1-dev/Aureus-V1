const EDIT_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR'];
const REVIEW_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];
const PRIVILEGED_ROLES = ['STEWARD', 'PLATFORM_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'];

export function knowledgePermissions(membershipRole: string | null, userRoles: string[]) {
  const privileged = userRoles.some((role) => PRIVILEGED_ROLES.includes(role));
  return {
    canEdit: privileged || Boolean(membershipRole && EDIT_ROLES.includes(membershipRole)),
    canReview: privileged || Boolean(membershipRole && REVIEW_ROLES.includes(membershipRole)),
  };
}
