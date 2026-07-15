-- AlterTable
ALTER TABLE "Certification" ADD COLUMN "sequenceNumber" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Certification_sequenceNumber_key" ON "Certification"("sequenceNumber");
