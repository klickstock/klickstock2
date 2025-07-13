// @actions/contributors.ts

"use server";

import { auth } from "@/auth";
import { db } from "@/lib/prisma";
import { bufferizeFile } from "@/lib/cloudinary"; // Assuming this is a general buffer utility now
import { uploadImageToS3, deleteImageFromS3, getSignedReadUrl, deleteMultipleImagesFromS3, getPresignedUploadUrl } from "@/lib/s3";
import { hasContributorAccess } from "@/lib/permissions";
import { ContributorItemStatus, InitialUpload } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generatePreviewWithWatermarkSafe } from "@/lib/image-processing";
import { sanitizeFileName, getPreviewFileName } from "@/lib/file-utils";
import { UploadFile } from "@/redux/features/uploadSlice";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

// ===================================================================
// FUNCTIONS FOR MANAGING INITIAL UPLOADS (REVISED)
// ===================================================================

/**
 * Handles the initial upload of one or more files to S3 and creates records in the InitialUpload table.
 */
export async function handleInitialUploads(formData: FormData): Promise<{ success: boolean; count: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated. Please log in.");
  if (!(await hasContributorAccess())) throw new Error("You don't have permission to upload content.");

  const files = formData.getAll("files") as File[];
  if (!files || files.length === 0) throw new Error("No files were provided for upload.");

  const userId = session.user.id;

  // BEST PRACTICE: Verify user exists before proceeding
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User associated with this session not found. Please log out and log back in.");
  }

  const folderName = `freepik-contributors/${userId}`;
  const maxSize = 50 * 1024 * 1024; // 50MB

  try {
    // 1. Process all file uploads to S3 in parallel
    const s3Uploads = await Promise.all(
      files.map(async (file) => {
        if (file.size > maxSize) throw new Error(`File "${file.name}" exceeds the 50MB size limit.`);
        if (!file.type.startsWith("image/")) throw new Error(`File "${file.name}" is not a valid image type.`);

        const originalBuffer = await bufferizeFile(file);

        const previewResult = await generatePreviewWithWatermarkSafe(originalBuffer);
        if (!previewResult) {
          throw new Error(`Failed to generate preview for "${file.name}".`);
        }
        const { buffer: previewBuffer, width, height } = previewResult;

        const sanitizedFileName = sanitizeFileName(file.name);
        const previewFileName = getPreviewFileName(file.name);

        // Store previews in a dedicated subfolder for better organization
        const previewFolderName = `${folderName}/previews`;

        const [originalUpload, previewUpload] = await Promise.all([
          uploadImageToS3(originalBuffer, folderName, sanitizedFileName),
          uploadImageToS3(previewBuffer, previewFolderName, previewFileName),
        ]);

        // Return the data needed for the database record
        return {
          originalFileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          s3Key: originalUpload.key,
          previewS3Key: previewUpload.key,
          userId,
          width,
          height,
        };
      })
    );

    // 2. Insert all records into the database in a single, efficient query.
    // This avoids opening many parallel connections, which was the likely cause of your database error.
    const result = await db.initialUpload.createMany({
      data: s3Uploads,
    });

    revalidatePath('/contributor/upload');
    return { success: true, count: result.count };

  } catch (error: any) {
    console.error("Initial upload error:", error);
    // In a real-world scenario, you might want to add logic here to delete
    // the files that were successfully uploaded to S3 before the error occurred.
    throw new Error(error.message || "An unexpected error occurred during file upload.");
  }
}


/**
 * Fetches initial uploads and attaches signed URLs for client-side display.
 */
export async function getInitialUploadsWithSignedUrls(): Promise<UploadFile[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated. Please log in.");

  // FIX: Removed the `select` block. The default `findMany` will fetch all
  // scalar fields needed (id, s3Key, previewS3Key, width, height, etc.),
  // which is required for other functions to work correctly.
  const uploads = await db.initialUpload.findMany({
    where: { userId: session.user.id, contributorItemId: null },
    orderBy: { createdAt: 'desc' },
  });

  // This part is fine as it needs to generate a signed URL for each item.
  const uploadsWithUrls = await Promise.all(
    uploads.map(async (upload) => {
      try {
        const previewUrl = await getSignedReadUrl(upload.previewS3Key);
        return {
          id: upload.id,
          previewUrl,
          originalFileName: upload.originalFileName,
          title: upload.originalFileName.split('.').slice(0, -1).join('.').replace(/[-_]/g, ' '),
          description: '',
          tags: [],
          license: 'STANDARD',
          category: '',
          imageType: upload.mimeType.includes('png') ? 'PNG' : 'JPG',
          aiGeneratedStatus: 'NOT_AI_GENERATED',
          width: upload.width, // Pass dimensions to the client
          height: upload.height,
        };
      } catch (urlError) {
        console.error(`Failed to get signed URL for ${upload.previewS3Key}:`, urlError);
        // Return a fallback object so the UI doesn't crash
        return {
          id: upload.id,
          previewUrl: '', // Provide a placeholder or empty string
          originalFileName: upload.originalFileName,
          title: 'Error loading preview',
          description: '', tags: [], license: 'STANDARD', category: '',
          imageType: 'JPG', aiGeneratedStatus: 'NOT_AI_GENERATED',
          width: null,
          height: null,
        };
      }
    })
  );
  // Filter out any items that failed to get a URL
  return uploadsWithUrls.filter(upload => upload.previewUrl) as UploadFile[];
}


interface PresignedUrlRequest {
  fileName: string;
  fileType: string;
}

/**
 * 1. Generates pre-signed URLs for clients to upload files directly to S3.
 */
export async function getPresignedUrls(files: PresignedUrlRequest[]): Promise<{ url: string, key: string }[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated. Please log in.");
  if (!(await hasContributorAccess())) throw new Error("You don't have permission to upload content.");

  const userId = session.user.id;
  const folderName = `freepik-contributors/${userId}`;

  try {
    const presignedUrlData = await Promise.all(
      files.map(file => {
        const sanitizedFileName = sanitizeFileName(file.fileName);
        return getPresignedUploadUrl(folderName, sanitizedFileName, file.fileType);
      })
    );
    return presignedUrlData;
  } catch (error) {
    console.error("Error generating pre-signed URLs:", error);
    throw new Error("Could not prepare files for upload.");
  }
}

interface FinalizeUploadRequest {
  s3Key: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * 2. Finalizes an upload after the client pushes the file to S3.
 *    This involves generating a preview and creating the database record.
 */
export async function finalizeUpload(fileData: FinalizeUploadRequest): Promise<InitialUpload> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated.");

  const { s3Key, originalFileName, fileSize, mimeType } = fileData;
  const userId = session.user.id;

  try {
    // BEST PRACTICE: Verify user exists before proceeding
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User associated with this session not found. Please log out and log back in.");
    }

    const folderName = `freepik-contributors/${userId}`;

    // A. Fetch the just-uploaded original file from S3
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
    });
    const { Body } = await s3Client.send(getObjectCommand);
    if (!Body) throw new Error(`Could not retrieve uploaded file from S3: ${s3Key}`);
    const originalBuffer = Buffer.from(await Body.transformToByteArray());

    // B. Generate watermarked preview and get dimensions
    const previewResult = await generatePreviewWithWatermarkSafe(originalBuffer);
    if (!previewResult) {
      throw new Error(`Failed to generate preview for "${originalFileName}".`);
    }
    const { buffer: previewBuffer, width, height } = previewResult;

    // C. Upload the preview file to S3 in its own folder
    const previewFolderName = `${folderName}/previews`;
    const previewFileName = getPreviewFileName(originalFileName);
    const { key: previewS3Key } = await uploadImageToS3(previewBuffer, previewFolderName, previewFileName);

    // D. Create the database record
    const newUploadRecord = await db.initialUpload.create({
      data: {
        userId,
        s3Key,
        previewS3Key,
        originalFileName,
        fileSize,
        mimeType,
        width, // Save dimensions
        height,
      }
    });

    revalidatePath('/contributor/upload');
    return newUploadRecord;

  } catch (error: any) {
    console.error("Error finalizing upload:", error);
    // Attempt to clean up the original file if finalization fails
    await deleteImageFromS3(s3Key).catch(cleanupError => console.error("Cleanup failed for", s3Key, cleanupError));
    throw new Error(error.message || "An unexpected error occurred while processing the file.");
  }
}
/**
 * Deletes ALL specified initial uploads and their corresponding files from S3.
 * This function was already well-written and efficient. No changes needed.
 */
export async function deleteAllInitialUploads(fileIds: string[]): Promise<{ count: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated. Please log in.");

  if (!fileIds || fileIds.length === 0) {
    return { count: 0 };
  }

  try {
    const uploadsToDelete = await db.initialUpload.findMany({
      where: {
        id: { in: fileIds },
        userId: session.user.id,
        contributorItemId: null,
      },
      select: { id: true, s3Key: true, previewS3Key: true },
    });

    if (uploadsToDelete.length === 0) return { count: 0 };

    const s3Keys = uploadsToDelete.flatMap(upload => [upload.s3Key, upload.previewS3Key]);
    const validIdsToDelete = uploadsToDelete.map(upload => upload.id);

    await Promise.all([
      deleteMultipleImagesFromS3(s3Keys),
      db.initialUpload.deleteMany({
        where: { id: { in: validIdsToDelete } },
      }),
    ]);

    revalidatePath('/contributor/upload');
    return { count: uploadsToDelete.length };

  } catch (error: any) {
    console.error("Bulk delete initial uploads error:", error);
    throw new Error(error.message || "Failed to delete all selected uploads.");
  }
}

/**
 * Deletes a single initial upload record and its corresponding files from S3.
 * This function is for a single item and is correct. No changes needed.
 */
export async function deleteInitialUpload(id: string): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated. Please log in.");

  const uploadToDelete = await db.initialUpload.findUnique({ where: { id, userId: session.user.id } });

  if (!uploadToDelete) {
    throw new Error("Upload not found or you don't have permission to delete it.");
  }
  if (uploadToDelete.contributorItemId) {
    throw new Error("Cannot delete an upload that has already been submitted.");
  }

  try {
    await Promise.all([
      deleteImageFromS3(uploadToDelete.s3Key),
      deleteImageFromS3(uploadToDelete.previewS3Key)
    ]);
    await db.initialUpload.delete({ where: { id: uploadToDelete.id } }); // Use a more secure where clause
    revalidatePath('/contributor/upload');
    return { success: true };
  } catch (error: any) {
    console.error("Delete initial upload error:", error);
    throw new Error(error.message || "Failed to delete the upload.");
  }
}

/**
 * Creates ContributorItem records from submitted initial uploads.
 * REFACTORED to use a transaction-per-item model for scalability and resilience.
 */
export async function createContributorItemsFromUploads(itemsToSubmit: Omit<UploadFile, 'previewUrl' | 'originalFileName'>[], saveAsDraft: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated.");
  if (!itemsToSubmit || itemsToSubmit.length === 0) return { success: true, count: 0 };

  const userId = session.user.id;
  let successfulCount = 0;

  // 1. Fetch all valid initial uploads in one go (Your excellent optimization)
  const itemIds = itemsToSubmit.map(item => item.id);
  const initialUploads = await db.initialUpload.findMany({
    where: { id: { in: itemIds }, userId, contributorItemId: null },
  });
  const validUploadsMap = new Map(initialUploads.map(up => [up.id, up]));

  // --- THIS IS THE KEY CHANGE ---
  // We loop through each item and give it its own transaction.
  for (const item of itemsToSubmit) {
    const initialUpload = validUploadsMap.get(item.id);

    // Skip if the upload isn't valid (already submitted, not found, missing dimensions, etc.)
    if (!initialUpload || initialUpload.width == null || initialUpload.height == null) {
      console.warn(`Skipping item ${item.id}: Not found, missing dimensions, already submitted, or permission denied.`);
      continue;
    }

    try {
      // 2. Start a small, fast transaction for just this single item.
      await db.$transaction(async (tx) => {
        const bucket = process.env.AWS_BUCKET_NAME!;
        const region = process.env.AWS_REGION!;

        // 3. Create the ContributorItem
        const newContributorItem = await tx.contributorItem.create({
          data: {
            title: item.title, description: item.description, tags: item.tags,
            category: item.category,
            license: item.license, // Use the stricter type from Redux
            imageType: item.imageType,
            aiGeneratedStatus: item.aiGeneratedStatus,
            status: saveAsDraft ? ContributorItemStatus.DRAFT : ContributorItemStatus.PENDING,
            userId,
            imageUrl: `https://${bucket}.s3.${region}.amazonaws.com/${initialUpload.s3Key}`,
            previewUrl: `https://${bucket}.s3.${region}.amazonaws.com/${initialUpload.previewS3Key}`,
            width: initialUpload.width,
            height: initialUpload.height,
          }
        });

        // 4. Link the InitialUpload to the new ContributorItem.
        // This prevents it from being submitted again.
        await tx.initialUpload.update({
          where: { id: initialUpload.id },
          data: { contributorItemId: newContributorItem.id },
        });
      });

      // 5. If the transaction succeeds, increment our counter.
      successfulCount++;

    } catch (error) {
      // 6. If this specific item fails, log the error and continue to the next one.
      console.error(`Failed to process and submit item ${item.id} (${item.title}). Error:`, error);
      // The overall process does not stop.
    }
  }

  // 7. Revalidate paths and return the count of successfully processed items.
  if (successfulCount > 0) {
    revalidatePath('/contributor/upload');
    revalidatePath('/contributor/drafts');
    revalidatePath('/contributor/under-review');
  }

  return { success: true, count: successfulCount };
}

// ===================================================================
// ORIGINAL FUNCTIONS (NOW FIXED)
// ===================================================================

export async function uploadImageToServer(formData: FormData, saveDraft: boolean = false) {
  // Check authentication and permissions
  const session = await auth();
  const hasAccess = await hasContributorAccess();

  if (!session || !session.user) throw new Error("Not authenticated. Please log in.");
  if (!hasAccess) throw new Error("You don't have permission to upload content. Please contact an administrator.");
  if (!session.user.id) throw new Error("User ID not found in session");

  // Get form data
  const file = formData.get("file") as File;
  const previewFile = formData.get("preview") as File; // Get the preview file
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const license = formData.get("license") as string || "STANDARD";
  const category = formData.get("category") as string;
  const imageType = formData.get("imageType") as string || "JPG";
  const aiGeneratedStatus = formData.get("aiGeneratedStatus") as string || "NOT_AI_GENERATED";

  // Extract tags
  const tags: string[] = [];
  formData.getAll("keywords[]").forEach((tag) => {
    if (typeof tag === "string" && tag.trim()) {
      tags.push(tag.trim());
    }
  });

  if (!file || !title || !previewFile) throw new Error("Missing required fields");

  try {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) throw new Error(`File size exceeds the maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed");

    const buffer = await bufferizeFile(file);
    const previewBuffer = await bufferizeFile(previewFile);

    // Get image dimensions from the buffer
    const { width, height } = await sharp(buffer).metadata();
    if (!width || !height) {
      throw new Error("Could not determine image dimensions.");
    }

    const sanitizedFileName = sanitizeFileName(file.name);
    const previewFileName = getPreviewFileName(file.name);

    const folderName = `freepik-contributors/${session.user.id}`;
    // Note: uploadImageToS3 now returns { url, key }
    const { url: imageUrl } = await uploadImageToS3(buffer, folderName, sanitizedFileName);
    const { url: previewUrl } = await uploadImageToS3(previewBuffer, folderName, previewFileName);

    if (!imageUrl || !previewUrl) throw new Error("Failed to upload images to S3");

    const item = await db.contributorItem.create({
      data: {
        title, description, imageUrl, previewUrl,
        width,
        height,
        status: saveDraft ? ContributorItemStatus.DRAFT : ContributorItemStatus.PENDING,
        userId: session.user.id,
        license: license === "EXTENDED" ? "EXTENDED" : "STANDARD",
        tags, category: category || "", imageType: imageType || "JPG",
        aiGeneratedStatus: aiGeneratedStatus || "NOT_AI_GENERATED"
      }
    });

    return { success: true, message: saveDraft ? "Image saved as draft" : "Image uploaded successfully", itemId: item.id };
  } catch (error: any) {
    console.error("Upload error:", error);
    throw new Error(error.message || "Failed to upload image");
  }
}

export async function submitDraftForReview(itemId: string) {
  const session = await auth();
  if (!session || !session.user) throw new Error("Not authenticated. Please log in.");
  if (!(await hasContributorAccess())) throw new Error("You don't have permission to submit content for review.");

  try {
    const item = await db.contributorItem.findUnique({ where: { id: itemId, userId: session.user.id, status: ContributorItemStatus.DRAFT } });
    if (!item) throw new Error("Draft not found or you don't have permission to submit it");

    const itemAny = item as any;
    if (!item.title || !itemAny.category) throw new Error("Please fill in all required fields before submitting for review");

    const updatedItem = await db.contributorItem.update({ where: { id: itemId }, data: { status: ContributorItemStatus.PENDING } });

    return { success: true, message: "Draft submitted for review", itemId: updatedItem.id };
  } catch (error: any) {
    console.error("Submit draft error:", error);
    throw new Error(error.message || "Failed to submit draft for review");
  }
}

export async function deleteDraft(itemId: string) {
  const session = await auth();
  if (!session || !session.user) throw new Error("Not authenticated. Please log in.");

  try {
    const item = await db.contributorItem.findFirst({ where: { id: itemId, userId: session.user.id } });
    if (!item) throw new Error("Item not found or you don't have permission to delete it");

    await db.contributorItem.delete({ where: { id: itemId } });

    return { success: true, message: "Item deleted successfully" };
  } catch (error: any) {
    console.error("Delete draft error:", error);
    throw new Error(error.message || "Failed to delete item");
  }
}

export async function updateDraft(id: string, data: { title: string; description: string; category: string; tags: string[] }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  try {
    if (!data.title || !data.category) throw new Error("Title and category are required");

    return await db.contributorItem.update({
      where: { id, userId: session.user.id, status: "DRAFT" },
      data: { title: data.title, description: data.description, category: data.category, tags: data.tags },
    });
  } catch (error: any) {
    console.error("Update draft error:", error);
    throw new Error(error.message || "Failed to update draft");
  }
}

export async function withdrawSubmission(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("You must be logged in to withdraw a submission");

  const existingItem = await db.contributorItem.findUnique({
    where: { id, userId: session.user.id, status: ContributorItemStatus.PENDING },
  });

  if (!existingItem) throw new Error("Item not found or not in review status");

  await db.contributorItem.update({
    where: { id },
    data: { status: ContributorItemStatus.DRAFT },
  });

  revalidatePath('/contributor/under-review');
  revalidatePath('/contributor/drafts');

  return { success: true };
}