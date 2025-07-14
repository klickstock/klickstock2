import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/prisma";
import {
  Download,
  Eye,
  Search,
  Grid,
  ArrowLeft,
  CheckCircle2,
  SortAsc,
  ChevronLeft
} from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { ImageWithPattern } from "@/components/ui/image-with-pattern";

const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "downloads", label: "Most Downloaded" },
];

export default async function CreatorProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>,
  searchParams: Promise<{
    q?: string;
    sort?: string;
  }>
}) {
  const { id } = await params;
  const { q, sort } = await searchParams;
  const searchQuery = q || "";
  const sortOption = sort || "popular";

  // Fetch the contributor
  const contributor = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          contributorItems: {
            where: { status: "APPROVED" }
          }
        }
      }
    }
  });

  // If user not found, return 404
  if (!contributor) {
    notFound();
  }

  // Fetch the contributor's stats
  const contributorStats = await db.contributorItem.aggregate({
    where: {
      userId: id,
      status: "APPROVED"
    },
    _sum: {
      downloads: true,
      views: true
    }
  });

  const totalDownloads = contributorStats._sum.downloads || 0;
  const totalViews = contributorStats._sum.views || 0;

  // Fetch the contributor's approved items
  const approvedItems = await db.contributorItem.findMany({
    where: {
      userId: id,
      status: "APPROVED",
      // Title, description, or tags contains search query
      ...(searchQuery ? {
        OR: [
          { title: { contains: searchQuery, mode: 'insensitive' } },
          { description: { contains: searchQuery, mode: 'insensitive' } },
          { tags: { has: searchQuery } }
        ]
      } : {})
    },
    orderBy: sortOption === "newest"
      ? [{ createdAt: 'desc' }]
      : sortOption === "downloads"
        ? [{ downloads: 'desc' }]
        : [{ views: 'desc' }, { createdAt: 'desc' }]
  });

  // Function to generate sort URL with updated params
  const getSortUrl = (value: string) => {
    const params = new URLSearchParams();

    if (searchQuery) params.set('q', searchQuery);
    if (value !== 'popular') params.set('sort', value);

    return `/creator/${id}?${params.toString()}`;
  };

  // Function to check if a sort option is active
  const isSortActive = (value: string) => {
    return sortOption === value;
  };

  // Format the contributor name for display
  const displayName = contributor.name || contributor.email.split('@')[0];

  return (

    <div className="min-h-screen bg-black text-white">
      {/* Hero section with contributor info */}

      <div className="border-b border-gray-800/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/gallery" className="inline-flex items-center text-sm text-indigo-400 hover:text-indigo-300 mb-6">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Gallery
          </Link>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Contributor avatar */}
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-800 overflow-hidden relative flex-shrink-0 border border-gray-700/50 shadow-lg">
              {contributor.image ? (
                <Image
                  src={contributor.image}
                  alt={displayName}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-300 text-4xl font-bold bg-gradient-to-br from-indigo-900/30 to-purple-900/30">
                  {displayName[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Contributor info */}
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">{displayName}</h1>

              {contributor.role === "CONTRIBUTOR" && (
                <div className="inline-flex items-center mt-1 px-2 py-0.5 bg-indigo-900/30 text-indigo-300 border border-indigo-800/50 rounded-full text-sm">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Verified Contributor
                </div>
              )}

              <p className="text-gray-400 mt-2">
                Member since {new Date(contributor.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>

              <div className="flex flex-wrap gap-6 mt-4">
                <div className="flex items-center">
                  <Grid className="w-5 h-5 text-indigo-400 mr-2" />
                  <div>
                    <p className="text-2xl font-bold text-white">{contributor._count.contributorItems}</p>
                    <p className="text-sm text-gray-400">Resources</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Download className="w-5 h-5 text-green-400 mr-2" />
                  <div>
                    <p className="text-2xl font-bold text-white">{totalDownloads.toLocaleString()}</p>
                    <p className="text-sm text-gray-400">Downloads</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Eye className="w-5 h-5 text-blue-400 mr-2" />
                  <div>
                    <p className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</p>
                    <p className="text-sm text-gray-400">Views</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and sort controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          {/* Search */}
          <form action={`/creator/${id}`} className="w-full md:w-auto">
            <div className="relative">
              <input
                type="text"
                name="q"
                defaultValue={searchQuery}
                placeholder="Search resources..."
                className="px-4 py-2 pr-10 rounded-lg bg-gray-800/80 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-64 text-white placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </form>

          {/* Sort options */}
          <div className="flex flex-wrap items-center">
            <span className="text-sm text-gray-400 mr-3">Sort by:</span>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <Link
                  key={option.value}
                  href={getSortUrl(option.value)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${isSortActive(option.value)
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-6">
          <p className="text-gray-400">
            {approvedItems.length} resources
            {searchQuery && ` for "${searchQuery}"`}
          </p>
        </div>

        {/* Image grid */}
        {approvedItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
            {approvedItems.map((item) => (
              <div key={item.id} className="group bg-gray-900/60 rounded-xl overflow-hidden shadow-md border border-gray-800/50 hover:shadow-lg hover:border-gray-700/70 transition-all">
                <Link href={`/gallery/${item.id}`} className="block aspect-square relative overflow-hidden">
                  <ImageWithPattern
                    src={item.cleanPreviewUrl || item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 16vw"
                    className="object-cover transform group-hover:scale-105 transition-transform duration-500 h-full w-full"
                    imageType={item.imageType || "JPG"}
                  />

                  {/* AI badge */}
                  {item.aiGeneratedStatus === 'AI_GENERATED' && (
                    <div className="absolute top-2 left-2 bg-purple-600/80 text-white text-xs px-2 py-0.5 rounded-full">
                      AI Generated
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-80 transition-opacity flex flex-col justify-end">
                    <div className="p-4 w-full">
                      <div className="flex justify-between text-white mb-2">
                        <div className="flex items-center space-x-1 text-xs bg-black/70 px-2 py-1 rounded-full">
                          <Eye className="w-3 h-3" />
                          <span>{item.views || 0}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs bg-black/70 px-2 py-1 rounded-full">
                          <Download className="w-3 h-3" />
                          <span>{item.downloads || 0}</span>
                        </div>
                      </div>
                      <h3 className="text-white font-medium truncate">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                </Link>
                <div className="p-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>

                    {/* File type badge */}
                    <span className="text-xs text-gray-300 px-2 py-0.5 bg-gray-800 rounded">
                      {item.imageType || 'JPG'}
                    </span>
                  </div>

                  {/* Tags/keywords */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tags.slice(0, 2).map((tag, index) => (
                        <Link
                          key={index}
                          href={`/creator/${id}?q=${tag}`}
                          className="text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </Link>
                      ))}
                      {item.tags.length > 2 && (
                        <span className="text-xs text-gray-400 px-1">
                          +{item.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-gray-900/40 rounded-xl border border-gray-800/50">
            <h3 className="text-lg font-medium text-gray-200 mb-2">No resources found</h3>
            {searchQuery ? (
              <>
                <p className="text-gray-400 mb-4">Try adjusting your search terms</p>
                <Link
                  href={`/creator/${id}`}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg transition-colors inline-block"
                >
                  View all resources
                </Link>
              </>
            ) : (
              <p className="text-gray-400">This contributor has not published any resources yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 