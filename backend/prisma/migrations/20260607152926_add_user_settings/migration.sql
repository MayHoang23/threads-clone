-- CreateEnum
CREATE TYPE "MessagesFrom" AS ENUM ('EVERYONE', 'FOLLOWING', 'NONE');

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "likeNotif" BOOLEAN NOT NULL DEFAULT true,
    "commentNotif" BOOLEAN NOT NULL DEFAULT true,
    "followNotif" BOOLEAN NOT NULL DEFAULT true,
    "emailNotif" BOOLEAN NOT NULL DEFAULT false,
    "allowMessagesFrom" "MessagesFrom" NOT NULL DEFAULT 'EVERYONE',

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
