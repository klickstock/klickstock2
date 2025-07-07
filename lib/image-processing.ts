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

import sharp from 'sharp';

// --- MODIFIED: Increased resolution ---
const PREVIEW_MAX_WIDTH = 1600;
const WATERMARK_TEXT = 'KlickStock'; // Note: This constant is not used in your SVG logic

// --- MODIFIED: Scaled up watermark for better visibility on larger images ---
const TILE_SIZE = 400; // The size of the repeatable watermark tile

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

  // --- FIX 1: Removed leading newline from the SVG string ---
  // The XML declaration must be the very first thing in the string.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg id="Pattren" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 2000 2000">
  <!-- (The rest of your very long SVG goes here...) -->
  <!-- ... SVG content omitted for brevity ... -->
  <g class="st2">
    <g>
      <g>
        <g>
          <path class="st0" d="M326.91,262.55l12.84,12.84-28.95,28.95,54.35-3.56,15.37,15.37-52.94,3.84-11.62,62.78-15.09-15.09,7.87-47.41h-13.87s-20.71,20.71-20.71,20.71l-12.84-12.84,65.59-65.59Z"/>
          <path class="st0" d="M385.67,321.3l12.46,12.46-65.59,65.59-12.46-12.46,65.59-65.59Z"/>
          <path class="st0" d="M415.09,346.23c4.5,4.5,4.31,11.81,0,16.12-4.31,4.31-11.53,4.4-16.02-.09-4.5-4.5-4.4-11.71-.09-16.02,4.31-4.31,11.62-4.5,16.12,0ZM387.54,361.41l12.46,12.46-46.48,46.48-12.46-12.46,46.48-46.48Z"/>
          <path class="st0" d="M382.85,403.2c14.24-14.24,34.76-13.96,48.73,0,11.53,11.53,13.31,26.61,7.12,37.11l-14.06-8.25c2.06-4.31,1.78-11.52-4.03-17.33-7.03-7.03-17.05-7.31-25.3.94-8.25,8.25-7.96,18.27-.94,25.3,5.81,5.81,13.02,6.09,17.43,3.94l8.15,14.15c-10.49,6.18-25.58,4.4-37.11-7.12-14.06-14.06-14.24-34.48,0-48.73Z"/>
          <path class="st0" d="M477.59,413.23l12.46,12.46-38.14,38.14,36.36-1.69,14.06,14.06-34.39,1.41-10.49,46.66-13.96-13.96,6.18-32.05-12.65.47-12.56,12.56-12.46-12.46,65.59-65.59Z"/>
          <path class="st0" d="M477.22,507.87l14.62,8.24c-3.28,4.97-5.25,16.12,3.47,24.83,5.72,5.72,13.03,7.59,17.99,2.62,4.12-4.12,2.9-10.4-.94-17.43l-6-10.87c-7.4-13.78-7.12-25.68,1.97-34.77,11.9-11.9,29.33-9.46,41.7,2.91,14.71,14.71,13.77,30.64,6.65,40.95l-14.81-8.25c3.19-4.69,4.5-12.93-3-20.43-5.72-5.72-12.65-7.03-17.33-2.34-4.22,4.22-3.19,9.18.94,16.68l6.09,10.96c8.53,15.46,6.46,26.89-2.06,35.42-12.09,12.09-29.99,9.18-42.82-3.65-15.55-15.55-14.15-35.51-6.46-44.88Z"/>
          <path class="st0" d="M534.2,571.03l20.99-20.99-8.62-8.62,10.49-10.49,3.75,3.75c3.65,3.65,7.22,2.53,13.68-3.93l3.75-3.75,12.46,12.46-12.56,12.56,11.34,11.34-10.49,10.49-11.34-11.34-20.15,20.15c-3.84,3.84-3.94,8.25-.19,12,2.06,2.06,4.59,3.84,6.93,5.06l-8.06,11.43c-3.75-1.87-7.59-4.59-10.78-7.78-10.12-10.12-10.59-22.96-1.22-32.33Z"/>
          <path class="st0" d="M570.18,590.53c14.34-14.34,35.42-13.31,49.38.66,13.96,13.96,14.99,35.04.65,49.38-14.34,14.34-35.33,13.4-49.38-.65-14.06-14.06-14.99-35.05-.66-49.38ZM582.08,628.67c7.31,7.31,18.09,7.03,25.67-.56,7.59-7.59,7.87-18.37.56-25.67-7.31-7.31-18.09-7.03-25.68.56-7.59,7.59-7.87,18.37-.56,25.68Z"/>
          <path class="st0" d="M625,645.35c14.24-14.24,34.76-13.96,48.73,0,11.52,11.52,13.31,26.61,7.12,37.11l-14.06-8.25c2.06-4.31,1.78-11.52-4.03-17.33-7.03-7.03-17.05-7.31-25.3.94-8.25,8.25-7.97,18.27-.94,25.3,5.81,5.81,13.02,6.09,17.43,3.94l8.15,14.15c-10.49,6.18-25.58,4.4-37.11-7.12-14.06-14.06-14.24-34.48,0-48.73Z"/>
          <path class="st0" d="M719.74,655.37l12.46,12.46-38.14,38.14,36.36-1.69,14.06,14.06-34.39,1.41-10.49,46.66-13.96-13.96,6.18-32.05-12.65.47-12.56,12.56-12.46-12.46,65.59-65.59Z"/>
        </g>
        <g>
          <path class="st0" d="M1299.13,1234.77l12.84,12.84-28.95,28.95,54.35-3.56,15.37,15.37-52.94,3.84-11.62,62.78-15.09-15.09,7.87-47.41h-13.87l-20.71,20.71-12.84-12.84,65.59-65.59Z"/>
          <path class="st0" d="M1357.88,1293.52l12.46,12.46-65.59,65.59-12.46-12.46,65.59-65.59Z"/>
          <path class="st0" d="M1387.3,1318.45c4.5,4.5,4.31,11.81,0,16.12s-11.53,4.4-16.02-.09c-4.5-4.5-4.4-11.71-.09-16.02,4.31-4.31,11.62-4.5,16.12,0ZM1359.76,1333.63l12.46,12.46-46.48,46.48-12.46-12.46,46.48-46.48Z"/>
          <path class="st0" d="M1355.07,1375.42c14.24-14.24,34.76-13.96,48.73,0,11.53,11.53,13.31,26.61,7.12,37.11l-14.06-8.25c2.06-4.31,1.78-11.52-4.03-17.33-7.03-7.03-17.05-7.31-25.3.94-8.25,8.25-7.96,18.27-.94,25.3,5.81,5.81,13.02,6.09,17.43,3.94l8.15,14.15c-10.49,6.18-25.58,4.4-37.11-7.12-14.06-14.06-14.24-34.48,0-48.73Z"/>
          <path class="st0" d="M1449.81,1385.45l12.46,12.46-38.14,38.14,36.36-1.69,14.06,14.06-34.39,1.41-10.49,46.66-13.96-13.96,6.18-32.05-12.65.47-12.56,12.56-12.46-12.46,65.59-65.59Z"/>
          <path class="st0" d="M1449.44,1480.09l14.62,8.24c-3.28,4.97-5.25,16.12,3.47,24.83,5.72,5.72,13.03,7.59,17.99,2.62,4.12-4.12,2.9-10.4-.94-17.43l-6-10.87c-7.4-13.78-7.12-25.68,1.97-34.77,11.9-11.9,29.33-9.46,41.7,2.91,14.71,14.71,13.77,30.64,6.65,40.95l-14.81-8.25c3.19-4.69,4.5-12.93-3-20.43-5.72-5.72-12.65-7.03-17.33-2.34-4.22,4.22-3.19,9.18.94,16.68l6.09,10.96c8.53,15.46,6.46,26.89-2.06,35.42-12.09,12.09-29.99,9.18-42.82-3.65-15.55-15.55-14.15-35.51-6.46-44.88Z"/>
          <path class="st0" d="M1506.41,1543.25l20.99-20.99-8.62-8.62,10.49-10.49,3.75,3.75c3.65,3.65,7.22,2.53,13.68-3.93l3.75-3.75,12.46,12.46-12.56,12.56,11.34,11.34-10.49,10.49-11.34-11.34-20.15,20.15c-3.84,3.84-3.94,8.25-.19,12,2.06,2.06,4.59,3.84,6.93,5.06l-8.06,11.43c-3.75-1.87-7.59-4.59-10.78-7.78-10.12-10.12-10.59-22.96-1.22-32.33Z"/>
          <path class="st0" d="M1542.4,1562.74c14.34-14.34,35.42-13.31,49.38.66s14.99,35.04.65,49.38-35.33,13.4-49.38-.65c-14.06-14.06-14.99-35.05-.66-49.38ZM1554.3,1600.88c7.31,7.31,18.09,7.03,25.67-.56s7.87-18.37.56-25.67c-7.31-7.31-18.09-7.03-25.68.56-7.59,7.59-7.87,18.37-.56,25.68Z"/>
          <path class="st0" d="M1597.22,1617.56c14.24-14.24,34.76-13.96,48.73,0,11.52,11.52,13.31,26.61,7.12,37.11l-14.06-8.25c2.06-4.31,1.78-11.52-4.03-17.33-7.03-7.03-17.05-7.31-25.3.94s-7.97,18.27-.94,25.3c5.81,5.81,13.02,6.09,17.43,3.94l8.15,14.15c-10.49,6.18-25.58,4.4-37.11-7.12-14.06-14.06-14.24-34.48,0-48.73Z"/>
          <path class="st0" d="M1691.95,1627.59l12.46,12.46-38.14,38.14,36.36-1.69,14.06,14.06-34.39,1.41-10.49,46.66-13.96-13.96,6.18-32.05-12.65.47-12.56,12.56-12.46-12.46,65.59-65.59Z"/>
        </g>
      </g>
      <g>
        <g>
          <path class="st0" d="M1234.52,700.96l12.84-12.84,28.95,28.95-3.56-54.35,15.37-15.37,3.84,52.94,62.78,11.62-15.09,15.09-47.41-7.87v13.87l20.71,20.71-12.84,12.84-65.59-65.59Z"/>
          <path class="st0" d="M1293.27,642.2l12.46-12.46,65.59,65.59-12.46,12.46-65.59-65.59Z"/>
          <path class="st0" d="M1318.2,612.78c4.5-4.5,11.81-4.31,16.12,0s4.4,11.53-.09,16.02c-4.5,4.5-11.71,4.4-16.02.09-4.31-4.31-4.5-11.62,0-16.12ZM1333.38,640.33l12.46-12.46,46.48,46.48-12.46,12.46-46.48-46.48Z"/>
          <path class="st0" d="M1375.17,645.01c-14.24-14.24-13.96-34.76,0-48.73,11.53-11.53,26.61-13.31,37.11-7.12l-8.25,14.06c-4.31-2.06-11.52-1.78-17.33,4.03-7.03,7.03-7.31,17.05.94,25.3,8.25,8.25,18.27,7.96,25.3.94,5.81-5.81,6.09-13.02,3.94-17.43l14.15-8.15c6.18,10.49,4.4,25.58-7.12,37.11-14.06,14.06-34.48,14.24-48.73,0Z"/>
          <path class="st0" d="M1385.2,550.28l12.46-12.46,38.14,38.14-1.69-36.36,14.06-14.06,1.41,34.39,46.66,10.49-13.96,13.96-32.05-6.18.47,12.65,12.56,12.56-12.46,12.46-65.59-65.59Z"/>
          <path class="st0" d="M1479.85,550.65l8.24-14.62c4.97,3.28,16.12,5.25,24.83-3.47,5.72-5.72,7.59-13.03,2.62-17.99-4.12-4.12-10.4-2.9-17.43.94l-10.87,6c-13.78,7.4-25.68,7.12-34.77-1.97-11.9-11.9-9.46-29.33,2.91-41.7,14.71-14.71,30.64-13.77,40.95-6.65l-8.25,14.81c-4.69-3.19-12.93-4.5-20.43,3-5.72,5.72-7.03,12.65-2.34,17.33,4.22,4.22,9.18,3.19,16.68-.94l10.96-6.09c15.46-8.53,26.89-6.46,35.42,2.06,12.09,12.09,9.18,29.99-3.65,42.82-15.55,15.55-35.51,14.15-44.88,6.46Z"/>
          <path class="st0" d="M1543.01,493.67l-20.99-20.99-8.62,8.62-10.49-10.49,3.75-3.75c3.65-3.65,2.53-7.22-3.93-13.68l-3.75-3.75,12.46-12.46,12.56,12.56,11.34-11.34,10.49,10.49-11.34,11.34,20.15,20.15c3.84,3.84,8.25,3.94,12,.19,2.06-2.06,3.84-4.59,5.06-6.93l11.43,8.06c-1.87,3.75-4.59,7.59-7.78,10.78-10.12,10.12-22.96,10.59-32.33,1.22Z"/>
          <path class="st0" d="M1562.5,457.69c-14.34-14.34-13.31-35.42.66-49.38,13.96-13.96,35.04-14.99,49.38-.65,14.34,14.34,13.4,35.33-.65,49.38-14.06,14.06-35.05,14.99-49.38.66ZM1600.64,445.79c7.31-7.31,7.03-18.09-.56-25.67-7.59-7.59-18.37-7.87-25.67-.56-7.31,7.31-7.03,18.09.56,25.68,7.59,7.59,18.37,7.87,25.68.56Z"/>
          <path class="st0" d="M1617.32,402.87c-14.24-14.24-13.96-34.76,0-48.73,11.52-11.52,26.61-13.31,37.11-7.12l-8.25,14.06c-4.31-2.06-11.52-1.78-17.33,4.03-7.03,7.03-7.31,17.05.94,25.3,8.25,8.25,18.27,7.97,25.3.94,5.81-5.81,6.09-13.02,3.94-17.43l14.15-8.15c6.18,10.49,4.4,25.58-7.12,37.11-14.06,14.06-34.48,14.24-48.73,0Z"/>
          <path class="st0" d="M1627.35,308.13l12.46-12.46,38.14,38.14-1.69-36.36,14.06-14.06,1.41,34.39,46.66,10.49-13.96,13.96-32.05-6.18.47,12.65,12.56,12.56-12.46,12.46-65.59-65.59Z"/>
        </g>
        <g>
          <path class="st0" d="M262.58,1672.9l12.84-12.84,28.95,28.95-3.56-54.35,15.37-15.37,3.84,52.94,62.78,11.62-15.09,15.09-47.41-7.87v13.87l20.71,20.71-12.84,12.84-65.59-65.59Z"/>
          <path class="st0" d="M321.33,1614.14l12.46-12.46,65.59,65.59-12.46,12.46-65.59-65.59Z"/>
          <path class="st0" d="M346.26,1584.72c4.5-4.5,11.81-4.31,16.12,0s4.4,11.53-.09,16.02c-4.5,4.5-11.71,4.4-16.02.09-4.31-4.31-4.5-11.62,0-16.12ZM361.44,1612.27l12.46-12.46,46.48,46.48-12.46,12.46-46.48-46.48Z"/>
          <path class="st0" d="M403.23,1616.95c-14.24-14.24-13.96-34.76,0-48.73,11.53-11.53,26.61-13.31,37.11-7.12l-8.25,14.06c-4.31-2.06-11.52-1.78-17.33,4.03-7.03,7.03-7.31,17.05.94,25.3,8.25,8.25,18.27,7.96,25.3.94,5.81-5.81,6.09-13.02,3.94-17.43l14.15-8.15c6.18,10.49,4.4,25.58-7.12,37.11-14.06,14.06-34.48,14.24-48.73,0Z"/>
          <path class="st0" d="M413.26,1522.22l12.46-12.46,38.14,38.14-1.69-36.36,14.06-14.06,1.41,34.39,46.66,10.49-13.96,13.96-32.05-6.18.47,12.65,12.56,12.56-12.46,12.46-65.59-65.59Z"/>
          <path class="st0" d="M507.9,1522.59l8.24-14.62c4.97,3.28,16.12,5.25,24.83-3.47,5.72-5.72,7.59-13.03,2.62-17.99-4.12-4.12-10.4-2.9-17.43.94l-10.87,6c-13.78,7.4-25.68,7.12-34.77-1.97-11.9-11.9-9.46-29.33,2.91-41.7,14.71-14.71,30.64-13.77,40.95-6.65l-8.25,14.81c-4.69-3.19-12.93-4.5-20.43,3-5.72,5.72-7.03,12.65-2.34,17.33,4.22,4.22,9.18,3.19,16.68-.94l10.96-6.09c15.46-8.53,26.89-6.46,35.42,2.06,12.09,12.09,9.18,29.99-3.65,42.82-15.55,15.55-35.51,14.15-44.88,6.46Z"/>
          <path class="st0" d="M571.06,1465.61l-20.99-20.99-8.62,8.62-10.49-10.49,3.75-3.75c3.65-3.65,2.53-7.22-3.93-13.68l-3.75-3.75,12.46-12.46,12.56,12.56,11.34-11.34,10.49,10.49-11.34,11.34,20.15,20.15c3.84,3.84,8.25,3.94,12,.19,2.06-2.06,3.84-4.59,5.06-6.93l11.43,8.06c-1.87,3.75-4.59,7.59-7.78,10.78-10.12,10.12-22.96,10.59-32.33,1.22Z"/>
          <path class="st0" d="M590.56,1429.63c-14.34-14.34-13.31-35.42.66-49.38s35.04-14.99,49.38-.65,13.4,35.33-.65,49.38c-14.06,14.06-35.05,14.99-49.38.66ZM628.7,1417.73c7.31-7.31,7.03-18.09-.56-25.67-7.59-7.59-18.37-7.87-25.67-.56-7.31,7.31-7.03,18.09.56,25.68s18.37,7.87,25.68.56Z"/>
          <path class="st0" d="M645.38,1374.81c-14.24-14.24-13.96-34.76,0-48.73,11.52-11.52,26.61-13.31,37.11-7.12l-8.25,14.06c-4.31-2.06-11.52-1.78-17.33,4.03-7.03,7.03-7.31,17.05.94,25.3,8.25,8.25,18.27,7.97,25.3.94,5.81-5.81,6.09-13.02,3.94-17.43l14.15-8.15c6.18,10.49,4.4,25.58-7.12,37.11-14.06,14.06-34.48,14.24-48.73,0Z"/>
          <path class="st0" d="M655.4,1280.07l12.46-12.46,38.14,38.14-1.69-36.36,14.06-14.06,1.41,34.39,46.66,10.49-13.96,13.96-32.05-6.18.47,12.65,12.56,12.56-12.46,12.46-65.59-65.59Z"/>
        </g>
      </g>
      <g>
        <rect class="st0" x="-3.58" y="1639.79" width="7.31" height="720.39" transform="translate(-1414.18 585.84) rotate(-45)"/>
        <rect class="st0" x="-3.58" y="1639.79" width="7.31" height="720.39" transform="translate(1414.23 585.73) rotate(45)"/>
      </g>
      <g>
        <rect class="st0" x="1996.27" y="-360.19" width="7.31" height="720.39" transform="translate(585.77 -1414.15) rotate(45)"/>
        <rect class="st0" x="1996.27" y="-360.19" width="7.31" height="720.39" transform="translate(3414.09 -1414.14) rotate(135)"/>
      </g>
      <g>
        <rect class="st0" x="996.56" y="680.78" width="6.85" height="638.6" transform="translate(1000.05 -414.18) rotate(45)"/>
        <rect class="st0" x="996.56" y="680.78" width="6.85" height="638.6" transform="translate(2414.25 1000.14) rotate(135)"/>
      </g>
      <g>
        <g>
          <rect class="st0" x="1996.49" y="680.7" width="6.85" height="638.6" transform="translate(1292.87 -1121.27) rotate(45)"/>
          <rect class="st0" x="1996.49" y="680.7" width="6.85" height="638.6" transform="translate(4121.19 292.95) rotate(135)"/>
        </g>
        <g>
          <rect class="st0" x="-3.35" y="680.7" width="6.85" height="638.6" transform="translate(707.13 292.84) rotate(45)"/>
          <rect class="st0" x="-3.35" y="680.7" width="6.85" height="638.6" transform="translate(707.24 1707.05) rotate(135)"/>
        </g>
      </g>
      <g>
        <rect class="st0" x="-3.64" y="-360.12" width="7.31" height="720.39" transform="translate(.06 .01) rotate(45)"/>
        <rect class="st0" x="-3.64" y="-360.12" width="7.31" height="720.39" transform="translate(.08 .13) rotate(135)"/>
      </g>
      <g>
        <rect class="st0" x="1996.33" y="1639.72" width="7.31" height="720.39" transform="translate(4828.35 1999.87) rotate(135)"/>
        <rect class="st0" x="1996.33" y="1639.72" width="7.31" height="720.39" transform="translate(2000.04 4828.29) rotate(-135)"/>
      </g>
      <g>
        <g>
          <rect class="st0" x="996.57" y="1680.62" width="6.85" height="638.6" transform="translate(3121.27 2706.97) rotate(135)"/>
          <rect class="st0" x="996.57" y="1680.62" width="6.85" height="638.6" transform="translate(292.95 4121.19) rotate(-135)"/>
        </g>
        <g>
          <rect class="st0" x="996.57" y="-319.22" width="6.85" height="638.6" transform="translate(1707.16 -706.97) rotate(135)"/>
          <rect class="st0" x="996.57" y="-319.22" width="6.85" height="638.6" transform="translate(1707.05 707.24) rotate(-135)"/>
        </g>
      </g>
    </g>
  </g>
</svg>`;

  // The rest of the SVG rendering logic is fine.
  watermarkTileBuffer = await sharp(Buffer.from(svg))
    // It's good practice to define the tile size for clarity
    .resize(TILE_SIZE, TILE_SIZE)
    .png()
    .toBuffer();
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
    // FIX 1: Get metadata, including the format, from the ORIGINAL buffer first.
    const originalMetadata = await sharp(imageBuffer).metadata();
    const originalFormat = originalMetadata.format;

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

    const { width, height } = await sharp(resizedImage).metadata();

    if (!width || !height) {
      throw new Error('Failed to retrieve image dimensions after resizing.');
    }

    let watermarkCompositeOptions: sharp.OverlayOptions;

    if (width >= TILE_SIZE && height >= TILE_SIZE) {
      watermarkCompositeOptions = {
        input: await getWatermarkTileBuffer(),
        tile: true,
        blend: 'over',
      };
    } else {
      const singleWatermarkBuffer = await sharp(await getWatermarkTileBuffer())
        .resize(width, height, { fit: 'cover' })
        .png()
        .toBuffer();

      watermarkCompositeOptions = {
        input: singleWatermarkBuffer,
        tile: false,
        blend: 'over',
      };
    }

    // Step 4: Composite the watermark onto the resized image
    const watermarkedImage = sharp(resizedImage)
      .composite([watermarkCompositeOptions]);

    // FIX 2: Conditionally set the output format based on the original.
    let finalBuffer: Buffer;

    // Use a switch to handle different formats and provide appropriate options.
    switch (originalFormat) {
      case 'png':
        finalBuffer = await watermarkedImage
          .png() // Preserve PNG format (and transparency)
          .toBuffer();
        break;

      case 'webp':
        finalBuffer = await watermarkedImage
          .webp({ quality: 90 }) // Preserve WebP format
          .toBuffer();
        break;

      case 'jpeg':
      case 'jpg':
      default:
        // Default to JPEG for original JPEGs or any other unhandled format.
        finalBuffer = await watermarkedImage
          .jpeg({
            quality: 90,
            mozjpeg: true,
          })
          .toBuffer();
        break;
    }

    return finalBuffer;

  } catch (error: any) {
    console.error('Error generating preview with watermark:', error);
    throw new Error(`Failed to process image preview: ${error.message}`);
  }
}

// The safe wrapper function remains the same and is a good practice.
export async function generatePreviewWithWatermarkSafe(buffer: Buffer): Promise<Buffer | null> {
  try {
    return await generatePreviewWithWatermark(buffer);
  } catch (error) {
    console.error("Safely caught error during watermark generation:", error);
    return null;
  }
}