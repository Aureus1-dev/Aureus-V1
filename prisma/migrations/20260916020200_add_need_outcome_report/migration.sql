CREATE TYPE "NeedOutcomeStatus" AS ENUM ('RESOLVED', 'STILL_UNRESOLVED');

CREATE TABLE "NeedOutcomeReport" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "statedNeedId" UUID NOT NULL,
  "status" "NeedOutcomeStatus" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NeedOutcomeReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NeedOutcomeReport_userId_idx" ON "NeedOutcomeReport"("userId");
CREATE INDEX "NeedOutcomeReport_statedNeedId_createdAt_idx" ON "NeedOutcomeReport"("statedNeedId", "createdAt");

ALTER TABLE "NeedOutcomeReport"
  ADD CONSTRAINT "NeedOutcomeReport_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NeedOutcomeReport"
  ADD CONSTRAINT "NeedOutcomeReport_statedNeedId_fkey"
  FOREIGN KEY ("statedNeedId") REFERENCES "StatedNeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
