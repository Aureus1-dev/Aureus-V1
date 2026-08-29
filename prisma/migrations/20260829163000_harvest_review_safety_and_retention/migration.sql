ALTER TABLE "HarvestPlan" ADD COLUMN "retentionExpiresAt" TIMESTAMP(3);

UPDATE "HarvestPlan"
SET "retentionExpiresAt" = make_date("taxYear" + 8, 1, 1)::timestamp;

ALTER TABLE "HarvestPlan" ALTER COLUMN "retentionExpiresAt" SET NOT NULL;

CREATE INDEX "HarvestPlan_retentionExpiresAt_idx" ON "HarvestPlan"("retentionExpiresAt");
