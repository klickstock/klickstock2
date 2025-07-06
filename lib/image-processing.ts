// import sharp from 'sharp';

// /**
//  * Creates a repeating watermark pattern SVG
//  */
// function createWatermarkPatternSVG(width: number, height: number, text: string = 'KlickStock'): string {
//   // Calculate pattern size and spacing (reduced sizes for memory efficiency)
//   const patternWidth = 200;
//   const patternHeight = 80;
//   const xOffset = patternWidth / 2;
//   const yOffset = patternHeight / 2;

//   return `
//     <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
//       <defs>
//         <pattern id="watermark" x="0" y="0" width="${patternWidth}" height="${patternHeight}" 
//                  patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
//           <text
//             x="${xOffset}"
//             y="${yOffset}"
//             font-family="Arial, sans-serif"
//             font-size="16"
//             fill="rgba(255, 255, 255, 0.25)"
//             text-anchor="middle"
//             dominant-baseline="middle"
//           >${text}</text>
//         </pattern>
//       </defs>
//       <rect width="100%" height="100%" fill="url(#watermark)"/>
//     </svg>
//   `;
// }

// /**
//  * Generates a preview image with repeating watermark pattern
//  */
// export async function generatePreviewWithWatermark(
//   imageBuffer: Buffer,
//   watermarkText: string = 'KlickStock'
// ): Promise<Buffer> {
//   try {
//     // Initialize sharp with the buffer
//     const image = sharp(imageBuffer, {
//       failOnError: false, // Don't fail on corrupt images
//       limitInputPixels: 50000000, // Limit input size to ~50MP
//       sequentialRead: true // More memory efficient
//     });

//     // Get image metadata
//     const metadata = await image.metadata();
//     const originalWidth = metadata.width || 800;
//     const originalHeight = metadata.height || 600;

//     // Calculate preview dimensions (reduced max width for memory efficiency)
//     const maxWidth = 600; // Reduced from 800 to 600
//     const previewWidth = Math.min(originalWidth, maxWidth);
//     const previewHeight = Math.round((originalHeight * previewWidth) / originalWidth);

//     // Create the watermark pattern SVG
//     const watermarkSVG = createWatermarkPatternSVG(previewWidth, previewHeight, watermarkText);

//     // Process the image with optimized settings
//     const processedBuffer = await image
//       .rotate() // Auto-rotate based on EXIF
//       .resize(previewWidth, previewHeight, {
//         fit: 'inside',
//         withoutEnlargement: true
//       })
//       .composite([
//         {
//           input: Buffer.from(watermarkSVG),
//           blend: 'over',
//           tile: true // Enable tiling for better memory usage
//         }
//       ])
//       .jpeg({
//         quality: 75, // Slightly reduced quality for smaller file size
//         mozjpeg: true,
//         chromaSubsampling: '4:2:0', // Standard chroma subsampling
//         force: true // Always convert to JPEG
//       })
//       .toBuffer();

//     return processedBuffer;
//   } catch (error: any) {
//     console.error('Error generating preview with watermark:', error);
//     throw new Error(`Failed to process image: ${error.message || 'Unknown error'}`);
//   }
// }

// /**
//  * Safely process an image with memory limits
//  * This is a more conservative version for very large images
//  */
// export async function generatePreviewWithWatermarkSafe(
//   imageBuffer: Buffer,
//   watermarkText: string = 'KlickStock'
// ): Promise<Buffer> {
//   try {
//     // First pass - get dimensions and basic optimization
//     const image = sharp(imageBuffer, {
//       failOnError: false,
//       limitInputPixels: 50000000,
//       sequentialRead: true
//     });

//     // Get metadata
//     const metadata = await image.metadata();

//     // If image is very large, use more aggressive downsizing
//     const originalWidth = metadata.width || 800;
//     const originalHeight = metadata.height || 600;

//     // For very large images, do two-pass resizing
//     if (originalWidth > 2000 || originalHeight > 2000) {
//       // First pass - rough resize
//       const tempBuffer = await image
//         .resize(Math.min(originalWidth, 1000), Math.min(originalHeight, 1000), {
//           fit: 'inside',
//           withoutEnlargement: true
//         })
//         .toBuffer();

//       // Second pass - final resize and watermark
//       return generatePreviewWithWatermark(tempBuffer, watermarkText);
//     }

//     // For smaller images, use standard processing
//     return generatePreviewWithWatermark(imageBuffer, watermarkText);
//   } catch (error: any) {
//     console.error('Error in safe image processing:', error);
//     throw new Error(`Failed to process image safely: ${error.message || 'Unknown error'}`);
//   }
// }

// /**
//  * Alternative version that creates a tiled diagonal text watermark
//  */
// export async function generatePreviewWithTiledWatermark(
//   imageBuffer: Buffer,
//   watermarkText: string = '© KlickStock'
// ): Promise<Buffer> {
//   try {
//     // Get image metadata
//     const metadata = await sharp(imageBuffer).metadata();
//     const originalWidth = metadata.width || 800;
//     const originalHeight = metadata.height || 600;

//     // Calculate preview dimensions
//     const previewWidth = Math.min(originalWidth, 800);
//     const previewHeight = Math.round((originalHeight * previewWidth) / originalWidth);

//     // Create a small watermark tile
//     const tileSize = 200;
//     const tileSVG = `
//       <svg width="${tileSize}" height="${tileSize}" xmlns="http://www.w3.org/2000/svg">
//         <style>
//           .watermark { font-family: Arial, sans-serif; }
//         </style>
//         <text
//           x="50%"
//           y="50%"
//           font-size="16"
//           fill="rgba(255, 255, 255, 0.3)"
//           text-anchor="middle"
//           dominant-baseline="middle"
//           transform="rotate(-45, ${tileSize / 2}, ${tileSize / 2})"
//           class="watermark"
//         >${watermarkText}</text>
//       </svg>
//     `;

//     // Create the watermark tile buffer
//     const tileBuffer = await sharp(Buffer.from(tileSVG))
//       .png()
//       .toBuffer();

//     // Create a full-size watermark by extending the tile
//     const fullWatermarkSVG = `
//       <svg width="${previewWidth}" height="${previewHeight}" xmlns="http://www.w3.org/2000/svg">
//         <defs>
//           <pattern id="tile" x="0" y="0" width="${tileSize}" height="${tileSize}" patternUnits="userSpaceOnUse">
//             <image href="data:image/png;base64,${tileBuffer.toString('base64')}" width="${tileSize}" height="${tileSize}" />
//           </pattern>
//         </defs>
//         <rect width="100%" height="100%" fill="url(#tile)"/>
//       </svg>
//     `;

//     // Process the image
//     const processedBuffer = await sharp(imageBuffer)
//       .resize(previewWidth, previewHeight, {
//         fit: 'inside',
//         withoutEnlargement: true,
//       })
//       .composite([
//         {
//           input: Buffer.from(fullWatermarkSVG),
//           blend: 'over',
//         }
//       ])
//       .jpeg({
//         quality: 80,
//         mozjpeg: true,
//         chromaSubsampling: '4:4:4'
//       })
//       .toBuffer();

//     return processedBuffer;
//   } catch (error) {
//     console.error('Error generating preview with tiled watermark:', error);
//     throw error;
//   }
// } 

// lib/image-processing.ts

import sharp from 'sharp';

// --- MODIFIED: Increased resolution ---
const PREVIEW_MAX_WIDTH = 1600; // Increased from 800 for higher resolution previews
const WATERMARK_TEXT = 'KlickStock';

// --- MODIFIED: Scaled up watermark for better visibility on larger images ---
const TILE_SIZE = 400; // Increased from 300
const WATERMARK_FONT_SIZE = 32; // Increased from 24

// Cache for the watermark tile buffer
let watermarkTileBuffer: Buffer | null = null;

/**
 * Creates a small, transparent, repeatable watermark tile as a PNG buffer.
 * Cached in memory for performance.
 */
async function getWatermarkTileBuffer(): Promise<Buffer> {
  if (watermarkTileBuffer) {
    return watermarkTileBuffer;
  }

  const svg = `
    <svg width="${TILE_SIZE}" height="${TILE_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .watermark { font-family: Arial, sans-serif; font-weight: bold; }
      </style>
      <text
        x="50%"
        y="50%"
        font-size="${WATERMARK_FONT_SIZE}"
        fill="rgba(255, 255, 255, 0.25)"
        text-anchor="middle"
        dominant-baseline="middle"
        transform="rotate(-45, ${TILE_SIZE / 2}, ${TILE_SIZE / 2})"
        class="watermark"
      >${WATERMARK_TEXT}</text>
    </svg>
  `;

  watermarkTileBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return watermarkTileBuffer;
}

/**
 * Generates a preview image by resizing the original and overlaying a tiled or single watermark.
 * Handles both large and small images to avoid dimension errors.
 *
 * @param imageBuffer The buffer of the original uploaded image.
 * @returns A promise that resolves to the buffer of the watermarked preview image (as JPEG).
 */
export async function generatePreviewWithWatermark(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Step 1: Resize the image to the new, higher resolution
    const resizedImage = await sharp(imageBuffer, {
      failOnError: false,
    })
      .rotate()
      .resize({
        width: PREVIEW_MAX_WIDTH,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    // Step 2: Get the dimensions of the resized image
    const { width, height } = await sharp(resizedImage).metadata();

    if (!width || !height) {
      throw new Error('Failed to retrieve image dimensions after resizing.');
    }

    let watermarkBuffer: Buffer;
    let tile: boolean;

    // Step 3: Decide watermark strategy based on image size
    if (width >= TILE_SIZE && height >= TILE_SIZE) {
      // Use cached tile with tiling for larger images
      watermarkBuffer = await getWatermarkTileBuffer();
      tile = true;
    } else {
      // Generate a single SVG overlay for smaller images
      // This logic remains robust as it's relative to the image size
      const fontSize = Math.min(width, height) / 10;
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <style>
            .watermark { font-family: Arial, sans-serif; font-weight: bold; }
          </style>
          <text
            x="50%"
            y="50%"
            font-size="${fontSize}"
            fill="rgba(255, 255, 255, 0.25)"
            text-anchor="middle"
            dominant-baseline="middle"
            transform="rotate(-45, ${width / 2}, ${height / 2})"
            class="watermark"
          >${WATERMARK_TEXT}</text>
        </svg>
      `;
      watermarkBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
      tile = false;
    }

    // Step 4: Composite the watermark onto the resized image
    const finalBuffer = await sharp(resizedImage)
      .composite([{
        input: watermarkBuffer,
        tile,
        blend: 'over',
      }])
      .jpeg({
        // --- MODIFIED: Increased quality for better results at higher resolution ---
        quality: 90, // Increased from 85
        mozjpeg: true,
        force: true,
      })
      .toBuffer();

    return finalBuffer;
  } catch (error: any) {
    console.error('Error generating preview with watermark:', error);
    throw new Error(`Failed to process image preview: ${error.message}`);
  }
}

/**
 * A safe wrapper for watermark generation that returns null on failure.
 *
 * @param buffer The buffer of the original uploaded image.
 * @returns A promise that resolves to the watermarked buffer or null if an error occurs.
 */
export async function generatePreviewWithWatermarkSafe(buffer: Buffer): Promise<Buffer | null> {
  try {
    return await generatePreviewWithWatermark(buffer);
  } catch (error) {
    console.error("Safely caught error during watermark generation:", error);
    return null;
  }
}