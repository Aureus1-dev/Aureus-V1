-- Aureus Business Step 3 — Responsibilities & Promises
-- Adds the canonical Business Responsibility kind. The existing Responsibility
-- root already supports BUSINESS_TENANT + BUSINESS_PRIVATE context and the
-- append-only commitment/evidence ledger, so no second workflow table is added.

ALTER TYPE "ResponsibilityKind"
  ADD VALUE IF NOT EXISTS 'BUSINESS_PROMISE';
