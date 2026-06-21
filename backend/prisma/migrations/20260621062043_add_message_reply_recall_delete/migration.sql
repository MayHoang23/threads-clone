-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "deletedFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isRecalled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recalledAt" TIMESTAMP(3),
ADD COLUMN     "replyToId" TEXT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
