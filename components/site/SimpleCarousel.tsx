"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface CarouselItem {
  id: string;
  imageUrl: string;
  title: string;
  imageType?: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface SimpleCarouselProps {
  items: CarouselItem[];
}

export default function SimpleCarousel({ items }: SimpleCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Make sure we have enough items
  const displayItems = items.length >= 5 ? items : [];

  // Only show up to 5 items
  const limitedItems = displayItems.slice(0, Math.min(displayItems.length, 5));

  const nextSlide = () => {
    if (limitedItems.length === 0) return;
    setCurrentIndex((prev) => (prev === limitedItems.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    if (limitedItems.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? limitedItems.length - 1 : prev - 1));
  };

  if (limitedItems.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gray-900/60 border border-gray-800/50">
        <div className="h-[360px] md:h-[400px] flex items-center justify-center">
          <div className="text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-900/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Image Gallery</h3>
            <p className="text-gray-400 max-w-md mx-auto">Explore our collection of premium assets for your creative projects</p>
          </div>
        </div>
      </div>
    );
  }

  // Create a rotated list with the current index in the middle
  const visibleItems = [
    limitedItems[(currentIndex - 2 + limitedItems.length) % limitedItems.length],
    limitedItems[(currentIndex - 1 + limitedItems.length) % limitedItems.length],
    limitedItems[currentIndex],
    limitedItems[(currentIndex + 1) % limitedItems.length],
    limitedItems[(currentIndex + 2) % limitedItems.length]
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gray-900/60 border border-gray-800/50">
      {/* Carousel Controls */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-gray-900/60 hover:bg-gray-900/80 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all backdrop-blur-sm border border-gray-700/50"
        aria-label="Previous image"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-gray-900/60 hover:bg-gray-900/80 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all backdrop-blur-sm border border-gray-700/50"
        aria-label="Next image"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <div className="h-[360px] md:h-[400px] relative flex items-center justify-center overflow-hidden">
        {/* Carousel Items */}
        <div className="flex gap-4 px-4 transition-all duration-500 transform">
          {visibleItems.map((image, index) => {
            const isActive = index === 2; // Center item
            return (
              <Link
                href={`/gallery/${image.id}`}
                key={`${image.id}-${index}`}
                className={`relative overflow-hidden rounded-xl group 
                  transition-all duration-500 transform h-[300px] md:h-[350px]
                  ${isActive
                    ? 'w-[280px] md:w-[400px] shadow-xl z-10 scale-105 border-2 border-indigo-500/50'
                    : 'w-[200px] md:w-[280px] opacity-50 hover:opacity-80 border border-gray-700/30'
                  }`}
              >
                <div className="absolute inset-0 bg-gray-800">
                  {/* Add checkered background for PNG images */}
                  {image.imageType?.toUpperCase() === 'PNG' && (
                    <div className="absolute inset-0 z-0 bg-[url('/transparent-checkerboard.svg')] bg-repeat bg-[length:20px_20px] opacity-15"></div>
                  )}
                  <Image
                    src={image.imageUrl}
                    alt={image.title}
                    fill
                    sizes="(max-width: 768px) 280px, 400px"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    unoptimized={true}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-transparent opacity-60"></div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="font-medium text-lg truncate">
                    {image.title}
                  </h3>
                  {isActive && (
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm text-gray-300 line-clamp-1">
                        By {image.user.name || image.user.email.split('@')[0]}
                      </p>

                      {/* Add PNG badge for active slide */}
                      {image.imageType?.toUpperCase() === 'PNG' && (
                        <span className="bg-indigo-900/70 text-indigo-300 text-xs py-0.5 px-2 rounded-md backdrop-blur-sm flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 12h16M4 19h16" />
                          </svg>
                          PNG
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Pagination Indicators - Moved outside the carousel container */}
      <div className="mt-8">
        <div className="flex justify-center gap-2">
          {limitedItems.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`relative h-2 transition-all duration-300 ${index === currentIndex
                  ? 'w-12 bg-indigo-500'
                  : 'w-6 bg-gray-600 hover:bg-gray-500'
                } rounded-full overflow-hidden`}
              aria-label={`Go to slide ${index + 1}`}
            >
              {index === currentIndex && (
                <span
                  className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"
                  style={{ animationDuration: '1.5s' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 