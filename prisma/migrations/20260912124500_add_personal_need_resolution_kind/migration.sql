-- OR-004 Responsibility kind vocabulary.
-- Kept separate so PostgreSQL commits the enum value before the following
-- migration references it in CHECK constraints and partial-index predicates.
ALTER TYPE "ResponsibilityKind"
  ADD VALUE IF NOT EXISTS 'PERSONAL_NEED_RESOLUTION';
