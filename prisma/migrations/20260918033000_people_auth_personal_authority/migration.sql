-- PEOPLE-AUTH-001 — Personal Authority, Consent & Privacy

ALTER TYPE "AuthorityResourceClass" ADD VALUE 'DOCUMENT';

CREATE TYPE "AuthorityShareRecipientKind" AS ENUM (
  'PERSON',
  'ORGANIZATION',
  'PROVIDER',
  'INSTITUTION',
  'OTHER'
);

ALTER TABLE "AuthorityRequest"
  ADD COLUMN "shareRecipientKind" "AuthorityShareRecipientKind",
  ADD COLUMN "shareRecipientRef" TEXT,
  ADD COLUMN "shareDataFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "shareScopeKey" TEXT;

ALTER TABLE "AuthorityGrant"
  ADD COLUMN "shareRecipientKind" "AuthorityShareRecipientKind",
  ADD COLUMN "shareRecipientRef" TEXT,
  ADD COLUMN "shareDataFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "shareScopeKey" TEXT;

ALTER TABLE "AuthorityDecision"
  ADD COLUMN "shareScopeKey" TEXT;

ALTER TABLE "AuthorityRequest"
  ALTER COLUMN "policyVersion" SET DEFAULT 'people-step2-v2';

CREATE INDEX "AuthorityRequest_shareScopeKey_idx" ON "AuthorityRequest"("shareScopeKey");
CREATE INDEX "AuthorityGrant_shareScopeKey_idx" ON "AuthorityGrant"("shareScopeKey");
CREATE INDEX "AuthorityDecision_shareScopeKey_idx" ON "AuthorityDecision"("shareScopeKey");
