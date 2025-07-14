/**
 * Sanitizes a filename by:
 * 1. Removing special characters
 * 2. Converting spaces to hyphens
 * 3. Converting to lowercase
 * 4. Adding timestamp to ensure uniqueness
 * 5. Preserving the file extension
 */
export function sanitizeFileName(fileName: string): string {
  // Split the filename and extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex !== -1 ? fileName.slice(0, lastDotIndex) : fileName;
  const ext = lastDotIndex !== -1 ? fileName.slice(lastDotIndex) : '';

  // Sanitize the name part
  const sanitizedName = name
    .toLowerCase() // Convert to lowercase
    .replace(/[^a-z0-9]+/g, '-') // Replace special chars with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length

  // Add timestamp for uniqueness
  const timestamp = Date.now();

  // Combine parts
  return `${sanitizedName}-${timestamp}${ext.toLowerCase()}`;
}

/**
 * Generates a preview filename from the original filename
 */
export function getPreviewFileName(fileName: string): string {
  const sanitized = sanitizeFileName(fileName);
  const lastDotIndex = sanitized.lastIndexOf('.');

  if (lastDotIndex === -1) {
    return `preview-wm-${sanitized}.jpg`;
  }

  const name = sanitized.slice(0, lastDotIndex);
  return `preview-wm-${name}.jpg`; // Always use .jpg for preview
}

export const getCleanPreviewFileName = (fileName: string): string => {
  const sanitized = sanitizeFileName(fileName);
  const lastDotIndex = sanitized.lastIndexOf('.');

  if (lastDotIndex === -1) {
    return `clean-preview-${sanitized}.jpg`;
  }

  const name = sanitized.slice(0, lastDotIndex);
  return `clean-preview-${name}.jpg`; // Always use .jpg for preview
};