-- PF-006: public tenant Ward conversation with opaque guest continuity,
-- attributable grounding, and one unified AI cost ledger.

ALTER TYPE "AiCapability" ADD VALUE 'PUBLIC_WARD_CONVERSATION';

CREATE TYPE "WardConversationStatus" AS ENUM (
  'OPEN',
  'ESCALATION_OFFERED',
  'ESCALATED',
  'CLOSED',
  'EXPIRED'
);

CREATE TYPE "WardMessageRole" AS ENUM ('VISITOR', 'WARD');
CREATE TYPE "WardResponseKind" AS ENUM ('OPENING', 'GROUNDED', 'UNKNOWN', 'ESCALATION', 'SAFETY');

CREATE TABLE "WardConversation" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "accessTokenHash" TEXT NOT NULL,
  "status" "WardConversationStatus" NOT NULL DEFAULT 'OPEN',
  "turnCount" INTEGER NOT NULL DEFAULT 0,
  "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WardConversation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WardConversation_token_hash_check"
    CHECK ("accessTokenHash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "WardConversation_turn_count_check"
    CHECK ("turnCount" >= 0 AND "turnCount" <= 100),
  CONSTRAINT "WardConversation_expiry_check"
    CHECK ("tokenExpiresAt" > "createdAt" AND "expiresAt" >= "tokenExpiresAt")
);

CREATE UNIQUE INDEX "WardConversation_accessTokenHash_key"
  ON "WardConversation"("accessTokenHash");
CREATE UNIQUE INDEX "WardConversation_organizationId_id_key"
  ON "WardConversation"("organizationId", "id");
CREATE INDEX "WardConversation_organizationId_status_lastActivityAt_idx"
  ON "WardConversation"("organizationId", "status", "lastActivityAt");
CREATE INDEX "WardConversation_expiresAt_idx"
  ON "WardConversation"("expiresAt");

ALTER TABLE "WardConversation"
  ADD CONSTRAINT "WardConversation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WardMessage" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "role" "WardMessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "responseKind" "WardResponseKind",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WardMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WardMessage_content_check"
    CHECK (char_length("content") BETWEEN 1 AND 8000),
  CONSTRAINT "WardMessage_role_response_check"
    CHECK (
      ("role" = 'VISITOR' AND "responseKind" IS NULL)
      OR
      ("role" = 'WARD' AND "responseKind" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "WardMessage_organizationId_id_key"
  ON "WardMessage"("organizationId", "id");
CREATE INDEX "WardMessage_conversationId_createdAt_idx"
  ON "WardMessage"("conversationId", "createdAt");
CREATE INDEX "WardMessage_organizationId_createdAt_idx"
  ON "WardMessage"("organizationId", "createdAt");

ALTER TABLE "WardMessage"
  ADD CONSTRAINT "WardMessage_conversation_fkey"
  FOREIGN KEY ("organizationId", "conversationId")
  REFERENCES "WardConversation"("organizationId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WardMessageSource" (
  "organizationId" UUID NOT NULL,
  "wardMessageId" UUID NOT NULL,
  "knowledgeRecordId" UUID NOT NULL,
  "sourceTitle" TEXT NOT NULL,
  "sourceUrl" TEXT,
  "sourceReviewedAt" TIMESTAMP(3) NOT NULL,
  "sourceContentSha256" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WardMessageSource_pkey" PRIMARY KEY ("wardMessageId", "knowledgeRecordId"),
  CONSTRAINT "WardMessageSource_title_check"
    CHECK (char_length("sourceTitle") BETWEEN 1 AND 200),
  CONSTRAINT "WardMessageSource_content_hash_check"
    CHECK ("sourceContentSha256" ~ '^[a-f0-9]{64}$')
);

CREATE INDEX "WardMessageSource_organizationId_knowledgeRecordId_idx"
  ON "WardMessageSource"("organizationId", "knowledgeRecordId");

ALTER TABLE "WardMessageSource"
  ADD CONSTRAINT "WardMessageSource_message_fkey"
  FOREIGN KEY ("organizationId", "wardMessageId")
  REFERENCES "WardMessage"("organizationId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WardMessageSource"
  ADD CONSTRAINT "WardMessageSource_knowledge_fkey"
  FOREIGN KEY ("organizationId", "knowledgeRecordId")
  REFERENCES "BusinessKnowledgeRecord"("organizationId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Defense in depth: even a future code path that knows valid same-tenant IDs
-- cannot attribute a public answer to draft, rejected, deleted, or stale
-- knowledge, nor attach a source to a non-grounded message.
CREATE FUNCTION "enforce_current_approved_ward_source"()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "BusinessKnowledgeRecord" k
    WHERE k."organizationId" = NEW."organizationId"
      AND k."id" = NEW."knowledgeRecordId"
      AND k."status" = 'APPROVED'
      AND k."deletedAt" IS NULL
      AND k."reviewedAt" IS NOT NULL
      AND k."nextReviewAt" > NEW."createdAt"
  ) THEN
    RAISE EXCEPTION 'Ward source must be current approved tenant knowledge';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "WardMessage" m
    WHERE m."organizationId" = NEW."organizationId"
      AND m."id" = NEW."wardMessageId"
      AND m."role" = 'WARD'
      AND m."responseKind" = 'GROUNDED'
  ) THEN
    RAISE EXCEPTION 'Ward sources may attach only to grounded Ward messages';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "WardMessageSource_current_approved_insert"
BEFORE INSERT ON "WardMessageSource"
FOR EACH ROW EXECUTE FUNCTION "enforce_current_approved_ward_source"();

-- Public Ward provider calls use the existing AiRequest ledger so global and
-- per-capability spend totals cannot omit anonymous traffic. Member requests
-- remain user-owned; Ward requests are tenant/conversation-owned instead.
ALTER TABLE "AiRequest" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "AiRequest" ADD COLUMN "organizationId" UUID;
ALTER TABLE "AiRequest" ADD COLUMN "wardConversationId" UUID;

ALTER TABLE "AiRequest"
  ADD CONSTRAINT "AiRequest_identity_context_check"
  CHECK (
    (
      "userId" IS NOT NULL
      AND "organizationId" IS NULL
      AND "wardConversationId" IS NULL
    )
    OR
    (
      "userId" IS NULL
      AND "conversationId" IS NULL
      AND "organizationId" IS NOT NULL
      AND "wardConversationId" IS NOT NULL
    )
  );

CREATE INDEX "AiRequest_organizationId_createdAt_idx"
  ON "AiRequest"("organizationId", "createdAt");
CREATE INDEX "AiRequest_wardConversationId_idx"
  ON "AiRequest"("wardConversationId");

ALTER TABLE "AiRequest"
  ADD CONSTRAINT "AiRequest_wardConversation_fkey"
  FOREIGN KEY ("organizationId", "wardConversationId")
  REFERENCES "WardConversation"("organizationId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
