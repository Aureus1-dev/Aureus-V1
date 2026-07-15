-- CreateEnum
CREATE TYPE "KnowledgeCategory" AS ENUM ('ARTICLE', 'GUIDE', 'POLICY', 'BEST_PRACTICE', 'RESEARCH_SUMMARY', 'FAQ', 'TRAINING_MATERIAL', 'INSTITUTIONAL_DOCUMENTATION', 'REFERENCE_RESOURCE');

-- CreateEnum
CREATE TYPE "KnowledgeArticleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'KNOWLEDGE';

-- CreateTable
CREATE TABLE "KnowledgeArticle" (
    "id" UUID NOT NULL,
    "sequenceNumber" SERIAL NOT NULL,
    "articleRef" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "KnowledgeCategory" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceUrl" TEXT,
    "status" "KnowledgeArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "datePublished" TIMESTAMP(3),
    "dateLastVerified" TIMESTAMP(3),
    "authorId" UUID NOT NULL,
    "lastUpdatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "KnowledgeArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArticleRevision" (
    "id" UUID NOT NULL,
    "articleId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "KnowledgeCategory" NOT NULL,
    "editedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeArticleRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeArticle_sequenceNumber_key" ON "KnowledgeArticle"("sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeArticle_articleRef_key" ON "KnowledgeArticle"("articleRef");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_category_idx" ON "KnowledgeArticle"("category");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_verificationStatus_idx" ON "KnowledgeArticle"("verificationStatus");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_status_idx" ON "KnowledgeArticle"("status");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_authorId_idx" ON "KnowledgeArticle"("authorId");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_createdAt_idx" ON "KnowledgeArticle"("createdAt");

-- CreateIndex
CREATE INDEX "KnowledgeArticleRevision_articleId_idx" ON "KnowledgeArticleRevision"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeArticleRevision_articleId_versionNumber_key" ON "KnowledgeArticleRevision"("articleId", "versionNumber");

-- AddForeignKey
ALTER TABLE "KnowledgeArticleRevision" ADD CONSTRAINT "KnowledgeArticleRevision_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
