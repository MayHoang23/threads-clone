-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REPOST';

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "quotedPostId" TEXT,
ADD COLUMN     "repostOfId" TEXT;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_repostOfId_fkey" FOREIGN KEY ("repostOfId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_quotedPostId_fkey" FOREIGN KEY ("quotedPostId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
