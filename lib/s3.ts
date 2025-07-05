// @utils/s3.ts

import { PutObjectCommand, S3Client, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configure AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * NEW: Deletes multiple images from AWS S3 in a single request.
 * @param keys An array of S3 keys for the objects to delete.
 * @returns A promise that resolves when the deletion is attempted.
 */
export async function deleteMultipleImagesFromS3(keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return; // Nothing to delete
  }

  const deleteParams = {
    Bucket: process.env.BUCKET_NAME,
    Delete: {
      Objects: keys.map(key => ({ Key: key })),
      Quiet: false, // Set to false to get reports on successes and errors
    },
  };

  try {
    const command = new DeleteObjectsCommand(deleteParams);
    const { Deleted, Errors } = await s3Client.send(command);
    if (Deleted) {
      console.log(`Successfully deleted ${Deleted.length} objects from S3.`);
    }
    if (Errors) {
      console.error('S3 bulk delete encountered errors:', Errors);
      // You could add more robust logging or notifications here
    }
  } catch (error) {
    console.error('S3 bulk delete command failed:', error);
    // Similar to single delete, avoid throwing to prevent blocking other logic
  }
}

/**
 * Uploads a file buffer to AWS S3.
 * @param file The file buffer to upload.
 * @param folderName The name of the folder within the bucket.
 * @param fileName The name of the file.
 * @returns A promise that resolves to an object containing the public URL and the S3 key of the uploaded file.
 */
export async function uploadImageToS3(
  file: Buffer,
  folderName: string,
  fileName: string
): Promise<{ url: string; key: string }> {
  // Generate a unique key for the file
  const key = `${folderName}/${Date.now()}-${fileName}`;

  // Set up the upload parameters
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME || '',
    Key: key,
    Body: file,
    ContentType: 'image/jpeg', // Adjust content type as needed
  };

  try {
    // Upload file to S3
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Create the public URL to the uploaded file
    const fileUrl = `https://${params.Bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${params.Key}`;

    // Return both the URL and the key for future reference
    return { url: fileUrl, key };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
}

/**
 * Deletes an image from AWS S3.
 * @param key The S3 key of the object to delete.
 * @returns A promise that resolves when the object is deleted.
 */
export async function deleteImageFromS3(key: string): Promise<void> {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME || '',
    Key: key,
  };

  try {
    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    console.log(`Successfully deleted ${key} from S3.`);
  } catch (error) {
    console.error(`S3 delete error for key ${key}:`, error);
    // We don't throw an error here to allow the database record to be deleted
    // even if the S3 deletion fails, to avoid orphaned records.
    // You might want to add more robust error handling or logging here.
  }
}


// Function to generate a pre-signed URL for direct browser upload
export async function getPresignedUploadUrl(
  folderName: string,
  fileName: string,
  contentType: string = 'image/jpeg'
): Promise<{ url: string; key: string }> {
  // Generate a unique key for the file
  const key = `${folderName}/${Date.now()}-${fileName}`;

  // Set up the upload parameters
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME || '',
    Key: key,
    ContentType: contentType,
  };

  try {
    // Create a command for putting an object in the bucket
    const command = new PutObjectCommand(params);

    // Generate a pre-signed URL that expires in 15 minutes
    const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    return { url, key };
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    throw error;
  }
}

// Function to generate a pre-signed URL for reading an S3 object
export async function getSignedReadUrl(key: string): Promise<string> {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || '',
    Key: key,
  };

  try {
    // Create a command for getting an object from the bucket
    const command = new GetObjectCommand(params);

    // Generate a pre-signed URL that expires in 1 hour
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return url;
  } catch (error) {
    console.error('Error generating signed read URL:', error);
    throw error;
  }
}

// Function to extract S3 key from a full S3 URL
export function extractS3Key(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('.s3.') && urlObj.hostname.includes('.amazonaws.com')) {
      return decodeURIComponent(urlObj.pathname.slice(1)); // Remove leading slash and decode
    }
    if (urlObj.hostname.startsWith('s3.') && urlObj.hostname.includes('.amazonaws.com')) {
      const pathParts = urlObj.pathname.split('/');
      if (pathParts.length > 2) {
        return decodeURIComponent(pathParts.slice(2).join('/')); // Remove empty string and bucket name and decode
      }
    }
    return decodeURIComponent(urlObj.pathname.slice(1));
  } catch (error) {
    console.error('Error extracting S3 key from URL:', error);
    return null;
  }
}