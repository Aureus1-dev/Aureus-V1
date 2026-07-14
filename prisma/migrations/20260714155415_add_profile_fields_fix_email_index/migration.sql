-- DropIndex: remove full unique index (replaced by partial index below)
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "displayName" TEXT;

-- CreateIndex: partial unique index excludes soft-deleted users,
-- allowing a deleted user's email to be re-registered.
CREATE UNIQUE INDEX "User_email_active_key" ON "User"("email") WHERE "deletedAt" IS NULL;
