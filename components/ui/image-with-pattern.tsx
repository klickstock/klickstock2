// components/ui/image-with-pattern.tsx

"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ImageWithPatternProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number | null;
  height?: number | null;
  className?: string;      // This now applies to the root element, defining its size/layout.
  imageClassName?: string; // For the Next/Image tag itself.
  sizes?: string;
  priority?: boolean;
  quality?: number;
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
  imageClassName,
  sizes,
  priority = false,
  quality,
  imageType,
  showResolution = false,
  ...props
}: ImageWithPatternProps) {

  const isPngOrTransparent = imageType === "PNG" || src?.toLowerCase().endsWith(".png");
  const showPattern = isPngOrTransparent;

  const [resolution, setResolution] = useState<string>("");

  useEffect(() => {
    if (showResolution && width && height) {
      setResolution(`${width} × ${height}`);
    }
  }, [width, height, showResolution]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  if (!fill && (!width || !height)) {
    return <div className={cn("relative overflow-hidden bg-gray-800 animate-pulse w-full aspect-video", className)} />;
  }

  // --- FIX: The root div now applies the layout classes and ensures it's relative ---
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onContextMenu={handleContextMenu}
    >
      {showPattern && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: '#f0f0f0',
            backgroundImage: `
              linear-gradient(45deg, #ccc 25%, transparent 25%), 
              linear-gradient(-45deg, #ccc 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #ccc 75%), 
              linear-gradient(-45deg, transparent 75%, #ccc 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        />
      )}

      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        className={cn(
          "relative z-10", // Ensures image is above the pattern
          imageClassName   // All other styling (like object-fit and transitions) comes from the parent
        )}
        sizes={sizes}
        priority={priority}
        quality={quality}
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