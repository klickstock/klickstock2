/*
  Warnings:

  - A unique constraint covering the columns `[cleanPreviewS3Key]` on the table `InitialUpload` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ContributorItem" ADD COLUMN     "cleanPreviewUrl" TEXT,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "InitialUpload" ADD COLUMN     "cleanPreviewS3Key" TEXT,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "width" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "InitialUpload_cleanPreviewS3Key_key" ON "InitialUpload"("cleanPreviewS3Key");
