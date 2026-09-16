-- People Step 1 durable exhaustion writes source evidence on the terminal
-- RESPONSIBLY_EXHAUSTED ledger event, just as completion writes evidence on
-- COMPLETED. The original OR-001 constraint predated a persisted exhaustion
-- path and allowed evidence only on ACTION_EVIDENCED / COMPLETED, making the
-- now-real exhaustion transition fail at the database boundary.
--
-- This changes no columns, enums, authority, privacy, or domain model. It only
-- aligns the existing evidence-shape constraint with the existing terminal
-- event type and repository behavior.

ALTER TABLE "ResponsibilityEvent"
  DROP CONSTRAINT "ResponsibilityEvent_evidence_shape_check";

ALTER TABLE "ResponsibilityEvent"
  ADD CONSTRAINT "ResponsibilityEvent_evidence_shape_check" CHECK (
    (
      "type" IN ('ACTION_EVIDENCED', 'COMPLETED', 'RESPONSIBLY_EXHAUSTED')
      AND "sourceSystem" IS NOT NULL
      AND "sourceRecordType" IS NOT NULL
      AND "sourceRecordId" IS NOT NULL
      AND "sourceState" IS NOT NULL
      AND "evidenceLevel" IS NOT NULL
    ) OR (
      "type" NOT IN ('ACTION_EVIDENCED', 'COMPLETED', 'RESPONSIBLY_EXHAUSTED')
      AND "sourceSystem" IS NULL
      AND "sourceRecordType" IS NULL
      AND "sourceRecordId" IS NULL
      AND "sourceState" IS NULL
      AND "evidenceLevel" IS NULL
    )
  );
