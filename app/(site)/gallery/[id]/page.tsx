import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import {
  ArrowLeft,
  Calendar,
  Tag,
  Download,
  Eye,
  UserCircle2,
  ShieldCheck,
  FileType,
  Palette,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { ImageDetailActions } from "@/components/gallery/ImageDetailActions";
import { Badge } from "@/components/ui/badge";
import { ImageWithPattern } from "@/components/ui/image-with-pattern";

// Server action to increment view count
async function incrementViewCount(id: string) {
  'use server';

  await db.contributorItem.update({
    where: { id },
    data: {
      views: { increment: 1 }
    }
  });
}

export default async function ImageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Await params before destructuring
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // Increment view count
  await incrementViewCount(id);

  // Fetch the image details
  const image = await db.contributorItem.findUnique({
    where: {
      id,
      status: "APPROVED" // Only show approved images
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      }
    }
  });

  // If image not found or not approved, return 404
  if (!image) {
    notFound();
  }

  // Fetch related images by the same user
  const relatedImages = await db.contributorItem.findMany({
    where: {
      userId: image.userId,
      status: "APPROVED",
      id: { not: image.id } // Exclude current image
    },
    orderBy: { createdAt: 'desc' },
    take: 6
  });

  // Also fetch similar images by category or tags - increased limit
  const similarImages = await db.contributorItem.findMany({
    where: {
      id: { not: image.id }, // Exclude current image
      status: "APPROVED",
      OR: [
        { category: image.category },
        { tags: { hasSome: image.tags } }
      ]
    },
    orderBy: { downloads: 'desc' },
    take: 8, // Increased from 6 to 8
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  // Format image type for display
  const imageType = image.imageType || 'JPG';
  const isAiGenerated = image.aiGeneratedStatus === 'AI_GENERATED';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Content starts directly without separate navigation area */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Title, description, and back button in one container */}
        <div className="flex flex-col space-y-2 mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/gallery"
              className="bg-gray-800/80 hover:bg-gray-700 text-gray-200 hover:text-white transition-all 
                         text-sm font-medium py-2 px-4 rounded-full flex items-center 
                         shadow-md hover:shadow-lg"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Link>
            <h1 className="text-3xl font-bold text-white">{image.title}</h1>
          </div>
          <p className="text-gray-500 text-sm">
            {image.description || 'No description provided'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Main Image Display */}
            <div className="rounded-xl overflow-hidden bg-gray-900/60 border border-gray-800/50 shadow-lg">
              {/* This container will now grow/shrink with the image inside it */}
              <div className="relative w-full">
                {isAiGenerated && (
                  <div className="absolute top-4 left-4 z-20 bg-purple-600/80 text-white text-xs py-1 px-3 rounded-full">
                    AI Generated
                  </div>
                )}
                <ImageWithPattern
                  src={image.previewUrl || image.imageUrl}
                  alt={image.title}
                  priority
                  imageType={imageType}
                  showResolution={true}
                  width={image.width}
                  height={image.height}
                  // These classes make the image responsive while maintaining aspect ratio
                  imageClassName="w-full h-auto"
                />
              </div>
            </div>

            {/* Similar Content */}
            {similarImages.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Similar content</h2>
                  <Link
                    href={`/gallery?category=${image.category}`}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center"
                  >
                    View more <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-auto">
                  {similarImages.map((item) => (
                    <Link
                      key={item.id}
                      href={`/gallery/${item.id}`}
                      className="group block relative hover:opacity-95 transition-all duration-300 aspect-square"
                    >
                      <Image
                        src={item.previewUrl || item.imageUrl}
                        alt={item.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="w-full h-full object-cover rounded-lg transform group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Combined sections into one unified div */}
          <div>
            {/* Single Unified Card with all image information */}
            <div className="rounded-xl overflow-hidden bg-gray-900/60 border border-gray-800/50 shadow-lg">
              {/* User info section */}
              <div className="p-6 bg-gray-900/80">
                {/* Author info with avatar */}
                <Link href={`/creator/${image.userId}`} className="flex items-center space-x-3 mb-6 group">
                  <div className="h-12 w-12 rounded-full bg-gray-800 overflow-hidden relative flex-shrink-0">
                    {image.user.image ? (
                      <Image
                        src={image.user.image}
                        alt={image.user.name || "Creator"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-400">
                        <UserCircle2 className="h-full w-full" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white group-hover:text-indigo-400 transition-colors">
                      {image.user.name || image.user.email.split('@')[0]}
                    </p>
                    <p className="text-sm text-gray-400">View profile</p>
                  </div>
                </Link>

                {/* Image Actions using the updated component */}
                <ImageDetailActions
                  imageId={image.id}
                  imageUrl={image.imageUrl}
                  title={image.title}
                  currentDownloads={image.downloads || 0}
                  currentViews={image.views || 0}
                />
              </div>

              {/* Image details section */}
              <div className="border-t border-gray-800/50 px-6 py-5 bg-gray-900/60 space-y-4">
                <div className="flex">
                  <div className="w-1/3 text-sm text-gray-400">License</div>
                  <div className="w-2/3 text-sm text-gray-300 flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-2 text-emerald-500" />
                    {image.license || 'Standard License'}
                  </div>
                </div>

                <div className="flex">
                  <div className="w-1/3 text-sm text-gray-400">File type</div>
                  <div className="w-2/3 text-sm text-gray-300 flex items-center">
                    <FileType className="w-4 h-4 mr-2 text-blue-500" />
                    {imageType}
                  </div>
                </div>

                <div className="flex">
                  <div className="w-1/3 text-sm text-gray-400">Category</div>
                  <div className="w-2/3 text-sm text-gray-300">
                    <Link
                      href={`/gallery?category=${image.category}`}
                      className="flex items-center hover:text-indigo-400 transition-colors"
                    >
                      <Palette className="w-4 h-4 mr-2 text-purple-500" />
                      {image.category}
                    </Link>
                  </div>
                </div>

                {/* Tags section - now integrated into the same card */}
                {image.tags && image.tags.length > 0 && (
                  <>
                    <div className="border-t border-gray-800/30 pt-4 mt-4">
                      <h3 className="text-base font-medium text-white mb-3">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {image.tags.map((tag, index) => (
                          <Link
                            key={index}
                            href={`/gallery?q=${tag}`}
                            className="inline-flex items-center px-3 py-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
                          >
                            <Tag className="w-3 h-3 mr-1.5" />
                            {tag}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Legal Info - now integrated */}
                <div className="border-t border-gray-800/30 pt-4 mt-4 text-xs text-gray-400">
                  <p className="mb-2">
                    This resource can be used for personal and commercial projects with attribution.
                  </p>
                  <p>
                    © {new Date().getFullYear()} {image.user.name || 'Creator'} / KlickStock
                  </p>
                </div>
              </div>
            </div>

            {/* More from this creator */}
            {relatedImages.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">More from this creator</h2>
                  <Link
                    href={`/creator/${image.userId}`}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center"
                  >
                    View all <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {relatedImages.map((item) => (
                    <Link
                      key={item.id}
                      href={`/gallery/${item.id}`}
                      className="group block relative hover:opacity-95 transition-all aspect-square"
                    >
                      <Image
                        src={item.previewUrl || item.imageUrl}
                        alt={item.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 15vw"
                        className="w-full h-full object-cover rounded-lg transform group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}