-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'POST_HIDDEN';

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "triggeredId" DROP NOT NULL;
