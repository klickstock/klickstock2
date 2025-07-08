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
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ImageWithPatternProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  isPNG?: boolean;
  imageType?: string;
  showResolution?: boolean;
}

export function ImageWithPattern({
  src,
  alt,
  fill = false,
  width,
  height,
  className,
  sizes,
  priority = false,
  quality,
  isPNG,
  imageType,
  showResolution = false,
  ...props
}: ImageWithPatternProps) {
  // Determine if the image is PNG based on props or file extension
  const [shouldShowPattern, setShouldShowPattern] = useState<boolean>(
    isPNG || imageType === "PNG" || src?.toLowerCase().endsWith(".png")
  );

  const [imageResolution, setImageResolution] = useState<string>("");

  // Get image resolution
  useEffect(() => {
    if (showResolution && typeof window !== 'undefined') {
      const imgElement = document.createElement('img');
      imgElement.onload = () => {
        setImageResolution(`${imgElement.width} × ${imgElement.height}`);
      };
      imgElement.src = src;
    }
  }, [src, showResolution]);

  // Prevent right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  return (
    <div className={cn("relative overflow-hidden", className)} onContextMenu={handleContextMenu}>
      {/* Simple checkered background for transparent images */}
      {shouldShowPattern && (
        <div className="absolute inset-0 bg-[#f8f8f8]">
          <div className="absolute inset-0 opacity-50"
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

      {/* The actual image */}
      <div className="relative w-full h-full">
        <Image
          src={src}
          alt={alt}
          fill={fill}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          className={cn("object-contain", className)}
          sizes={sizes}
          priority={priority}
          quality={quality}
          unoptimized={shouldShowPattern}
          {...props}
        />
      </div>

      {showResolution && imageResolution && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md z-20">
          {imageResolution}
        </div>
      )}
    </div>
  );
} 