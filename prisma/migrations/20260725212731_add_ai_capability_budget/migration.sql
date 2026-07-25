-- CreateTable
CREATE TABLE "AiCapabilityBudget" (
    "id" UUID NOT NULL,
    "capability" "AiCapability" NOT NULL,
    "dailyBudgetUsd" DOUBLE PRECISION,
    "dailyRequestLimit" INTEGER,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCapabilityBudget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiCapabilityBudget_capability_key" ON "AiCapabilityBudget"("capability");
