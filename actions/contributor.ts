// @actions/contributors.ts

"use server";

import { auth } from "@/auth";
import { db } from "@/lib/prisma";
import { bufferizeFile } from "@/lib/cloudinary"; // Assuming this is a general buffer utility now
import { uploadImageToS3, deleteImageFromS3, getSignedReadUrl, deleteMultipleImagesFromS3 } from "@/lib/s3";
import { hasContributorAccess } from "@/lib/permissions";
import { ContributorItemStatus, InitialUpload } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generatePreviewWithWatermarkSafe } from "@/lib/image-processing";
import { sanitizeFileName, getPreviewFileName } from "@/lib/file-utils";
import { UploadFile } from "@/redux/features/uploadSlice";

// ===================================================================
// FUNCTIONS FOR MANAGING INITIAL UPLOADS (REVISED)
// ===================================================================

/**
 * Handles the initial upload of one or more files to S3 and creates records in the InitialUpload table.
 */
export async function handleInitialUploads(formData: FormData): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated. Please log in.");
  if (!(await hasContributorAccess())) throw new Error("You don't have permission to upload content.");

  const files = formData.getAll("files") as File[];
  if (!files || files.length === 0) throw new Error("No files were provided for upload.");

  const userId = session.user.id;
  const folderName = `freepik-contributors/${userId}`;
  const maxSize = 50 * 1024 * 1024; // 50MB

  try {
    const uploadPromises = files.map(async (file) => {
      if (file.size > maxSize) throw new Error(`File "${file.name}" exceeds the 50MB size limit.`);
      if (!file.type.startsWith("image/")) throw new Error(`File "${file.name}" is not a valid image type.`);

      const originalBuffer = await bufferizeFile(file);
      const previewBuffer = await generatePreviewWithWatermarkSafe(originalBuffer);
      if (!previewBuffer) throw new Error(`Failed to generate preview for "${file.name}".`);

      const sanitizedFileName = sanitizeFileName(file.name);
      const previewFileName = getPreviewFileName(file.name);

      const [originalUpload, previewUpload] = await Promise.all([
        uploadImageToS3(originalBuffer, folderName, sanitizedFileName),
        uploadImageToS3(previewBuffer, folderName, previewFileName)
      ]);

      return db.initialUpload.create({
        data: {
          originalFileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          s3Key: originalUpload.key,
          previewS3Key: previewUpload.key,
          userId,
        },
      });
    });

    await Promise.all(uploadPromises);
    revalidatePath('/contributor/upload');
    return { success: true };

  } catch (error: any) {
    console.error("Initial upload error:", error);
    throw new Error(error.message || "An unexpected error occurred during file upload.");
  }
}


/**
 * Fetches initial uploads and attaches signed URLs for client-side display.
 */
export async function getInitialUploadsWithSignedUrls(): Promise<UploadFile[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated. Please log in.");

  const uploads = await db.initialUpload.findMany({
    where: { userId: session.user.id, contributorItemId: null },
    orderBy: { createdAt: 'desc' },
  });

  const uploadsWithUrls = await Promise.all(
    uploads.map(async (upload) => {
      const previewUrl = await getSignedReadUrl(upload.previewS3Key);
      return {
        id: upload.id,
        previewUrl,
        originalFileName: upload.originalFileName,
        // Default metadata fields
        title: upload.originalFileName.split('.').slice(0, -1).join('.').replace(/[-_]/g, ' '),
        description: '',
        tags: [],
        license: 'STANDARD',
        category: '',
        imageType: upload.mimeType.includes('png') ? 'PNG' : 'JPG',
        aiGeneratedStatus: 'NOT_AI_GENERATED',
      };
    })
  );
  return uploadsWithUrls;
}

/**
 * NEW: Deletes ALL specified initial uploads and their corresponding files from S3.
 */
export async function deleteAllInitialUploads(fileIds: string[]): Promise<{ count: number }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated. Please log in.");

  if (!fileIds || fileIds.length === 0) {
    return { count: 0 };
  }

  try {
    // 1. Fetch all valid records belonging to the user that can be deleted
    const uploadsToDelete = await db.initialUpload.findMany({
      where: {
        id: { in: fileIds },
        userId: session.user.id,
        contributorItemId: null, // IMPORTANT: Only delete unsubmitted items
      },
      select: { id: true, s3Key: true, previewS3Key: true },
    });

    if (uploadsToDelete.length === 0) {
      return { count: 0 }; // No valid files to delete
    }

    // 2. Collect all S3 keys for bulk deletion
    const s3Keys = uploadsToDelete.flatMap(upload => [upload.s3Key, upload.previewS3Key]);
    const validIdsToDelete = uploadsToDelete.map(upload => upload.id);

    // 3. Perform bulk deletion from S3 and the database
    await Promise.all([
      deleteMultipleImagesFromS3(s3Keys), // Assumes you have a bulk delete helper in lib/s3
      db.initialUpload.deleteMany({
        where: {
          id: { in: validIdsToDelete },
        },
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
 * Deletes an initial upload record and its corresponding files from S3.
 */
export async function deleteInitialUpload(id: string): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated. Please log in.");

  const uploadToDelete = await db.initialUpload.findUnique({ where: { id } });

  if (!uploadToDelete || uploadToDelete.userId !== session.user.id) {
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
    await db.initialUpload.delete({ where: { id } });
    revalidatePath('/contributor/upload');
    return { success: true };
  } catch (error: any) {
    console.error("Delete initial upload error:", error);
    throw new Error(error.message || "Failed to delete the upload.");
  }
}

/**
 * NEW: Creates ContributorItem records from submitted initial uploads. This is the new "submit" logic.
 */
export async function createContributorItemsFromUploads(itemsToSubmit: Omit<UploadFile, 'previewUrl' | 'originalFileName'>[], saveAsDraft: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated. Please log in.");

  const userId = session.user.id;

  const results = await db.$transaction(async (tx) => {
    const createdItems = [];

    for (const item of itemsToSubmit) {
      // 1. Verify the initial upload record
      const initialUpload = await tx.initialUpload.findUnique({
        where: { id: item.id, userId, contributorItemId: undefined },
      });

      if (!initialUpload) {
        console.warn(`Skipping item ${item.id}: Not found, already submitted, or permission denied.`);
        continue;
      }

      // 2. Construct full S3 URLs
      const bucket = process.env.AWS_BUCKET_NAME || '';
      const region = process.env.AWS_REGION || 'us-east-1';
      const imageUrl = `https://${bucket}.s3.${region}.amazonaws.com/${initialUpload.s3Key}`;
      const previewUrl = `https://${bucket}.s3.${region}.amazonaws.com/${initialUpload.previewS3Key}`;

      // 3. Create the ContributorItem
      const newContributorItem = await tx.contributorItem.create({
        data: {
          title: item.title,
          description: item.description,
          tags: item.tags,
          category: item.category,
          license: item.license === 'EXTENDED' ? 'EXTENDED' : 'STANDARD',
          imageType: item.imageType,
          aiGeneratedStatus: item.aiGeneratedStatus,
          status: saveAsDraft ? ContributorItemStatus.DRAFT : ContributorItemStatus.PENDING,
          userId,
          imageUrl, // Full, permanent URL
          previewUrl, // Full, permanent URL
        }
      });

      // 4. Link the InitialUpload to the new ContributorItem
      await tx.initialUpload.update({
        where: { id: initialUpload.id },
        data: { contributorItemId: newContributorItem.id },
      });

      createdItems.push(newContributorItem);
    }
    return createdItems;
  });

  revalidatePath('/contributor/upload');
  revalidatePath('/contributor/drafts');
  revalidatePath('/contributor/under-review');

  return { success: true, count: results.length };
}



// ===================================================================
// ORIGINAL FUNCTIONS (UNCHANGED)
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