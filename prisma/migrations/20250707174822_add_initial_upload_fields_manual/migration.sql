-- AlterTable
ALTER TABLE "InitialUpload" ADD COLUMN     "aiGeneratedStatus" TEXT DEFAULT 'NOT_AI_GENERATED',
ADD COLUMN     "category" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageType" TEXT,
ADD COLUMN     "license" "License" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "title" TEXT;
