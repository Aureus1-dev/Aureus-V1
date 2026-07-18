-- CreateTable
CREATE TABLE "AiOperationalConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "emergencyStop" BOOLEAN NOT NULL DEFAULT false,
    "globalDailyBudgetUsd" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "userDailyBudgetUsd" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiOperationalConfig_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AiOperationalConfig" ADD CONSTRAINT "AiOperationalConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
