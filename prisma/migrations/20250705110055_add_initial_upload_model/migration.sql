/*
  Warnings:

  - You are about to drop the column `verificationToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `verificationTokenExpiry` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ContributorItem" ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "aiGeneratedStatus" DROP DEFAULT,
ALTER COLUMN "category" DROP DEFAULT,
ALTER COLUMN "imageType" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "verificationToken",
DROP COLUMN "verificationTokenExpiry";
