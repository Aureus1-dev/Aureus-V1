-- OR-002 Responsibility kind vocabulary.
-- Kept separate so PostgreSQL commits the enum value before a later migration
-- references it in CHECK constraints and partial-index predicates.

ALTER TYPE "ResponsibilityKind"
  ADD VALUE IF NOT EXISTS 'OPPORTUNITY_APPLICATION_GUIDANCE';
