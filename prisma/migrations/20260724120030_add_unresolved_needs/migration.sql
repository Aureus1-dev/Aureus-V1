-- CreateTable
CREATE TABLE "UnresolvedNeed" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "statedNeedId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnresolvedNeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnresolvedNeed_statedNeedId_key" ON "UnresolvedNeed"("statedNeedId");

-- CreateIndex
CREATE INDEX "UnresolvedNeed_userId_idx" ON "UnresolvedNeed"("userId");

-- AddForeignKey
ALTER TABLE "UnresolvedNeed" ADD CONSTRAINT "UnresolvedNeed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnresolvedNeed" ADD CONSTRAINT "UnresolvedNeed_statedNeedId_fkey" FOREIGN KEY ("statedNeedId") REFERENCES "StatedNeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
