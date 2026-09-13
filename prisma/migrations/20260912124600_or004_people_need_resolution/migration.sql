-- OR-004: one open Personal Need Responsibility per member/conversation.
-- This is the race-safety pair for the repository's idempotent lookup.
CREATE UNIQUE INDEX "Responsibility_one_open_personal_need_per_conversation"
ON "Responsibility" ("principalUserId", "originConversationId", "kind")
WHERE
  "contextType" = 'PERSONAL'
  AND "kind" = 'PERSONAL_NEED_RESOLUTION'
  AND "principalUserId" IS NOT NULL
  AND "originConversationId" IS NOT NULL
  AND "status" IN (
    'ACTIVE',
    'WAITING_ON_AUREUS',
    'WAITING_ON_USER',
    'WAITING_ON_THIRD_PARTY',
    'BLOCKED'
  );

-- Fail closed if application code ever tries to manufacture a cross-context
-- or widened-authority Personal Need Responsibility.
ALTER TABLE "Responsibility"
ADD CONSTRAINT "Responsibility_personal_need_resolution_shape"
CHECK (
  "kind" <> 'PERSONAL_NEED_RESOLUTION'
  OR (
    "contextType" = 'PERSONAL'
    AND "principalUserId" IS NOT NULL
    AND "principalOrganizationId" IS NULL
    AND "originConversationId" IS NOT NULL
    AND "originOpportunityId" IS NULL
    AND "authorityClass" = 'GUIDANCE_ONLY'
    AND "privacyScope" = 'PERSONAL_PRIVATE'
  )
);
