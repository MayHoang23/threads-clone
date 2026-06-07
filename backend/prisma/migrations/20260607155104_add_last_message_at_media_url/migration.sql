-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "lastMessageAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "mediaUrl" TEXT;
