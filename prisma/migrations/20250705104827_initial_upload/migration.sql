-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('UPLOADED', 'ASSOCIATED', 'FAILED');

-- CreateTable
CREATE TABLE "InitialUpload" (
    "id" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "previewS3Key" TEXT NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'UPLOADED',
    "userId" TEXT NOT NULL,
    "contributorItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InitialUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InitialUpload_s3Key_key" ON "InitialUpload"("s3Key");

-- CreateIndex
CREATE UNIQUE INDEX "InitialUpload_previewS3Key_key" ON "InitialUpload"("previewS3Key");

-- CreateIndex
CREATE UNIQUE INDEX "InitialUpload_contributorItemId_key" ON "InitialUpload"("contributorItemId");

-- AddForeignKey
ALTER TABLE "InitialUpload" ADD CONSTRAINT "InitialUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
