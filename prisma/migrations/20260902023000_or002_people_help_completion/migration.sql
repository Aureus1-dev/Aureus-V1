-- OR-002 People help-to-completion
--
-- Extends the already-reviewed Responsibility Core with one new PERSONAL /
-- GUIDANCE_ONLY kind. No Business/shared context or cross-context transfer is
-- introduced.

ALTER TABLE "Responsibility"
  ADD CONSTRAINT "Responsibility_application_guidance_origin_check" CHECK (
    "kind" <> 'OPPORTUNITY_APPLICATION_GUIDANCE'
    OR (
      "contextType" = 'PERSONAL'
      AND "principalUserId" IS NOT NULL
      AND "principalOrganizationId" IS NULL
      AND "originConversationId" IS NOT NULL
      AND "originOpportunityId" IS NOT NULL
      AND "authorityClass" = 'GUIDANCE_ONLY'
      AND "privacyScope" = 'PERSONAL_PRIVATE'
    )
  );

CREATE UNIQUE INDEX "Responsibility_open_application_guidance_key"
  ON "Responsibility"("principalUserId", "originOpportunityId")
  WHERE "contextType" = 'PERSONAL'
    AND "kind" = 'OPPORTUNITY_APPLICATION_GUIDANCE'
    AND "principalUserId" IS NOT NULL
    AND "originOpportunityId" IS NOT NULL
    AND "status" NOT IN ('COMPLETED', 'RESPONSIBLY_EXHAUSTED', 'CANCELLED');

-- OR-002 is the first slice to resume WAITING_ON_USER work. Tighten the
-- previously-forward-declared STATE_CHANGED shape now that it is reachable.
ALTER TABLE "ResponsibilityEvent"
  DROP CONSTRAINT "ResponsibilityEvent_or001_shape_check";

ALTER TABLE "ResponsibilityEvent"
  ADD CONSTRAINT "ResponsibilityEvent_or002_shape_check" CHECK (
    (
      "type" = 'ACCEPTED'
      AND "actorClass" = 'MEMBER'
      AND "actorUserId" IS NOT NULL
      AND "fromStatus" IS NULL
      AND "toStatus" = 'ACTIVE'
    ) OR (
      "type" = 'COMMITMENT_RECORDED'
      AND "actorClass" = 'AUREUS'
      AND "actorUserId" IS NULL
      AND "fromStatus" IS NULL
      AND "toStatus" IS NULL
    ) OR (
      "type" = 'USER_INPUT_REQUIRED'
      AND "actorClass" = 'AUREUS'
      AND "actorUserId" IS NULL
      AND "fromStatus" = 'ACTIVE'
      AND "toStatus" = 'WAITING_ON_USER'
    ) OR (
      "type" = 'STATE_CHANGED'
      AND "actorClass" = 'MEMBER'
      AND "actorUserId" IS NOT NULL
      AND "fromStatus" = 'WAITING_ON_USER'
      AND "toStatus" = 'ACTIVE'
    ) OR (
      "type" = 'ACTION_EVIDENCED'
      AND "actorClass" = 'SYSTEM'
      AND "actorUserId" IS NULL
      AND "fromStatus" IS NULL
      AND "toStatus" IS NULL
    ) OR (
      "type" = 'COMPLETED'
      AND "actorClass" = 'SYSTEM'
      AND "actorUserId" IS NULL
      AND "fromStatus" IN ('ACTIVE', 'WAITING_ON_USER')
      AND "toStatus" = 'COMPLETED'
    ) OR (
      "type" NOT IN (
        'ACCEPTED',
        'COMMITMENT_RECORDED',
        'USER_INPUT_REQUIRED',
        'STATE_CHANGED',
        'ACTION_EVIDENCED',
        'COMPLETED'
      )
    )
  );


-- Bind OR-002 tool sessions to the exact Responsibility they serve. Nullable
-- keeps legacy/direct See→Guide sessions valid without silently accepting a
-- Responsibility for them.
ALTER TABLE "GuidedApplicationSession"
  ADD COLUMN "responsibilityId" UUID;

CREATE INDEX "GuidedApplicationSession_responsibilityId_idx"
  ON "GuidedApplicationSession"("responsibilityId");

ALTER TABLE "GuidedApplicationSession"
  ADD CONSTRAINT "GuidedApplicationSession_responsibilityId_fkey"
  FOREIGN KEY ("responsibilityId") REFERENCES "Responsibility"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
