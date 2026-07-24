-- CreateEnum
CREATE TYPE "NeedEscalationStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "NeedEscalation" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "statedNeedId" UUID NOT NULL,
    "reason" TEXT,
    "status" "NeedEscalationStatus" NOT NULL DEFAULT 'PENDING',
    "acknowledgedById" UUID,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedById" UUID,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NeedEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedOnCallHours" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "hoursDescription" TEXT,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishedOnCallHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NeedEscalation_userId_idx" ON "NeedEscalation"("userId");

-- CreateIndex
CREATE INDEX "NeedEscalation_statedNeedId_idx" ON "NeedEscalation"("statedNeedId");

-- CreateIndex
CREATE INDEX "NeedEscalation_status_idx" ON "NeedEscalation"("status");

-- AddForeignKey
ALTER TABLE "NeedEscalation" ADD CONSTRAINT "NeedEscalation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeedEscalation" ADD CONSTRAINT "NeedEscalation_statedNeedId_fkey" FOREIGN KEY ("statedNeedId") REFERENCES "StatedNeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
