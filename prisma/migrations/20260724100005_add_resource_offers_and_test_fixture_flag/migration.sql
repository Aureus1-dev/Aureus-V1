-- CreateEnum
CREATE TYPE "ResourceOfferResponse" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "CitySheetEntry" ADD COLUMN     "isTestFixture" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ResourceOffer" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "statedNeedId" UUID NOT NULL,
    "citySheetEntryId" UUID NOT NULL,
    "response" "ResourceOfferResponse" NOT NULL DEFAULT 'PENDING',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ResourceOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceOffer_userId_idx" ON "ResourceOffer"("userId");

-- CreateIndex
CREATE INDEX "ResourceOffer_statedNeedId_idx" ON "ResourceOffer"("statedNeedId");

-- CreateIndex
CREATE INDEX "ResourceOffer_citySheetEntryId_idx" ON "ResourceOffer"("citySheetEntryId");

-- AddForeignKey
ALTER TABLE "ResourceOffer" ADD CONSTRAINT "ResourceOffer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceOffer" ADD CONSTRAINT "ResourceOffer_statedNeedId_fkey" FOREIGN KEY ("statedNeedId") REFERENCES "StatedNeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceOffer" ADD CONSTRAINT "ResourceOffer_citySheetEntryId_fkey" FOREIGN KEY ("citySheetEntryId") REFERENCES "CitySheetEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
