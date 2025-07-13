// // src/components/ui/image-with-pattern.tsx
// "use client";

// import Image from "next/image";
// import { useState, useEffect } from "react";
// import { cn } from "@/lib/utils";

// // Interface remains the same
// interface ImageWithPatternProps {
//   src: string;
//   alt: string;
//   fill?: boolean;
//   width?: number;
//   height?: number;
//   className?: string;
//   sizes?: string;
//   priority?: boolean;
//   quality?: number;
//   imageType?: string;
//   showResolution?: boolean;
// }

// export function ImageWithPattern({
//   src,
//   alt,
//   fill = false,
//   width,
//   height,
//   className,
//   sizes,
//   priority = false,
//   quality = 90, // Keep the high quality default
//   imageType,
//   showResolution = false,
//   ...props
// }: ImageWithPatternProps) {
//   const [shouldShowPattern] = useState<boolean>(
//     imageType === "PNG" || src?.toLowerCase().endsWith(".png")
//   );

//   const [imageResolution, setImageResolution] = useState<string>("");

//   useEffect(() => {
//     if (showResolution && typeof window !== 'undefined') {
//       const imgElement = document.createElement('img');
//       imgElement.onload = () => {
//         setImageResolution(`${imgElement.naturalWidth} × ${imgElement.naturalHeight}`);
//       };
//       imgElement.src = src;
//     }
//   }, [src, showResolution]);

//   const handleContextMenu = (e: React.MouseEvent) => {
//     e.preventDefault();
//     return false;
//   };

//   return (
//     // This root div now directly contains the pattern and the image.
//     // The 'className' prop passed from the parent (e.g., aspect-[4/3]) will define its size.
//     <div
//       className={cn("relative overflow-hidden", className)}
//       onContextMenu={handleContextMenu}
//     >
//       {/* Checkered background for transparency */}
//       {shouldShowPattern && (
//         <div className="absolute inset-0 bg-[#f8f8f8]">
//           <div className="absolute inset-0 opacity-50"
//             style={{
//               backgroundImage: `linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)`,
//               backgroundSize: '20px 20px',
//               backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
//             }}
//           />
//         </div>
//       )}

//       {/*
//         THE FIX: The <Image> component is now a direct child of the sized container.
//         We removed the intermediate <div className="relative w-full h-full">.
//         This gives Next.js a clearer path to calculate the required image size.
//       */}
//       <Image
//         src={src}
//         alt={alt}
//         fill={fill}
//         width={!fill ? width : undefined}
//         height={!fill ? height : undefined}
//         // The object-contain class should be on the image itself.
//         className="object-contain"
//         sizes={sizes}
//         priority={priority}
//         quality={quality}
//         {...props}
//       />

//       {showResolution && imageResolution && (
//         <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-20">
//           {imageResolution}
//         </div>
//       )}
//     </div>
//   );
// }



"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ImageWithPatternProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number | null;
  height?: number | null;
  className?: string; // Applied to the main container for layout
  imageClassName?: string; // Applied directly to the Next/Image tag
  sizes?: string;
  priority?: boolean;
  quality?: number;
  imageType?: string;
  showResolution?: boolean;
  isGallery?: boolean;
  objectFit?: "contain" | "cover";
}

export function ImageWithPattern({
  src,
  alt,
  fill = false,
  width,
  height,
  className,
  imageClassName,
  sizes,
  priority = false,
  quality,
  imageType,
  showResolution = false,
  isGallery = false,
  objectFit = "cover",
  ...props
}: ImageWithPatternProps) {

  const isPngOrTransparent = imageType === "PNG" || src?.toLowerCase().endsWith(".png");
  const showPattern = isPngOrTransparent && !isGallery;

  const [resolution, setResolution] = useState<string>("");

  const handleLoadingComplete = (img: HTMLImageElement) => {
    if (showResolution) {
      setResolution(`${img.naturalWidth} × ${img.naturalHeight}`);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Safety check: if not in fill mode, we must have width and height to prevent layout errors.
  if (!fill && (!width || !height)) {
    // Render a placeholder with a pulse animation to indicate loading or an error.
    return <div className={cn("relative overflow-hidden bg-gray-800 animate-pulse w-full aspect-video", className)} />;
  }

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onContextMenu={handleContextMenu}
    >
      {showPattern && (
        <div className="absolute inset-0 bg-[#f8f8f8]">
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: `
                linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
                linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
                linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
            }}
          />
        </div>
      )}

      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        className={cn(
          // This applies the responsive classes when NOT in fill mode
          !fill && "h-auto w-full",
          // This applies the object-fit property when in fill mode
          fill && `object-${objectFit}`,
          "relative z-10",
          imageClassName
        )}
        sizes={sizes}
        priority={priority}
        quality={quality}
        onLoadingComplete={handleLoadingComplete}
        {...props}
      />

      {showResolution && resolution && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-20">
          {resolution}
        </div>
      )}
    </div>
  );
}