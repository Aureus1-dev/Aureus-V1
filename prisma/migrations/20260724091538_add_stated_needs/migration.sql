-- CreateTable
CREATE TABLE "StatedNeed" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatedNeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StatedNeed_userId_idx" ON "StatedNeed"("userId");

-- CreateIndex
CREATE INDEX "StatedNeed_conversationId_idx" ON "StatedNeed"("conversationId");

-- AddForeignKey
ALTER TABLE "StatedNeed" ADD CONSTRAINT "StatedNeed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatedNeed" ADD CONSTRAINT "StatedNeed_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
