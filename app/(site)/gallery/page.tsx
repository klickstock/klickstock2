// @/app/gallery/page.tsx

import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/prisma";
import { Download, Eye, Search, Filter, ChevronDown, CheckCircle2, SlidersHorizontal, Image as ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithPattern } from "@/components/ui/image-with-pattern";
import { categoryOptions, imageTypeOptions, aiGenerationOptions } from "@/lib/constants";
import FilterSidebar from "../../../components/gallery/FilterSidebar";
import { SearchBar } from "@/components/gallery/SearchBar";
import { Prisma } from "@prisma/client";
import { MobileFilterToggle } from "@/components/gallery/MobileFilterToggle";
import { MobileOverlay } from "@/components/gallery/MobileOverlay";

// Filter options
const CATEGORIES = categoryOptions;
const IMAGE_TYPES = imageTypeOptions;
const AI_STATUS = aiGenerationOptions;

const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "downloads", label: "Most Downloaded" },
];

// Items per page
const ITEMS_PER_PAGE = 50;

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Await the searchParams since they are now a Promise in Next.js 15
  const resolvedSearchParams = await searchParams;

  // Use the search params directly since they are properly typed
  const searchQuery = resolvedSearchParams.q as string || "";
  const categoryFilter = resolvedSearchParams.category as string || "";
  const imageTypeFilter = resolvedSearchParams.imageType as string || "";
  const aiGeneratedFilter = resolvedSearchParams.aiGenerated as string || "";
  const sortOption = resolvedSearchParams.sort as string || "popular";
  const currentPage = Number(resolvedSearchParams.page as string) || 1;

  // Ensure searchQuery is a string (not an array)
  const normalizedSearchQuery = Array.isArray(searchQuery) ? searchQuery[0] || "" : searchQuery;

  // Build the where clause
  const whereClause: Prisma.ContributorItemWhereInput = {
    status: "APPROVED",
  };

  // Add search query filter if provided
  if (normalizedSearchQuery) {
    whereClause.OR = [
      { title: { contains: normalizedSearchQuery, mode: 'insensitive' } },
      { description: { contains: normalizedSearchQuery, mode: 'insensitive' } },
      { tags: { has: normalizedSearchQuery } }
    ];
  }

  // Add category filter if provided
  if (categoryFilter) {
    whereClause.category = categoryFilter;
  }

  // Add image type filter if provided
  if (imageTypeFilter) {
    whereClause.imageType = imageTypeFilter;
  }

  // Add AI generation filter if provided
  if (aiGeneratedFilter) {
    whereClause.aiGeneratedStatus = aiGeneratedFilter;
  }

  // Build the orderBy clause
  let orderByClause: Prisma.ContributorItemOrderByWithRelationInput[] = [];

  if (sortOption === "newest") {
    orderByClause = [{ createdAt: 'desc' }];
  } else if (sortOption === "downloads") {
    orderByClause = [{ downloads: 'desc' }];
  } else {
    // Default to popular (by views)
    orderByClause = [{ views: 'desc' }, { createdAt: 'desc' }];
  }

  // Get total count for pagination
  const totalItems = await db.contributorItem.count({
    where: whereClause
  });

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // Fetch paginated items
  const approvedItems = await db.contributorItem.findMany({
    where: whereClause,
    orderBy: orderByClause,
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
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

  // Function to generate filter URL with updated params
  const getFilterUrl = (paramName: string, value: string) => {
    const params = new URLSearchParams();

    if (normalizedSearchQuery) params.set('q', normalizedSearchQuery);
    if (categoryFilter && paramName !== 'category') params.set('category', categoryFilter);
    if (imageTypeFilter && paramName !== 'imageType') params.set('imageType', imageTypeFilter);
    if (aiGeneratedFilter && paramName !== 'aiGenerated') params.set('aiGenerated', aiGeneratedFilter);
    if (sortOption && paramName !== 'sort') params.set('sort', sortOption);

    // Add or remove the selected filter
    if (paramName === 'category' && categoryFilter !== value) params.set('category', value);
    if (paramName === 'imageType' && imageTypeFilter !== value) params.set('imageType', value);
    if (paramName === 'aiGenerated' && aiGeneratedFilter !== value) params.set('aiGenerated', value);
    if (paramName === 'sort' && sortOption !== value) params.set('sort', value);

    // Reset to page 1 when changing filters
    if (paramName !== 'page') {
      params.set('page', '1');
    } else if (value) {
      params.set('page', value);
    }

    return `/gallery?${params.toString()}`;
  };

  // Function to get pagination URL
  const getPaginationUrl = (page: number) => {
    return getFilterUrl('page', page.toString());
  };

  // Function to check if a filter is active
  const isFilterActive = (paramName: string, value: string) => {
    if (paramName === 'category') return categoryFilter === value;
    if (paramName === 'imageType') return imageTypeFilter === value;
    if (paramName === 'aiGenerated') return aiGeneratedFilter === value;
    if (paramName === 'sort') return sortOption === value;
    return false;
  };

  // Function to get a clear filter URL
  const getClearFilterUrl = () => {
    const params = new URLSearchParams();
    if (normalizedSearchQuery) params.set('q', normalizedSearchQuery);
    return `/gallery${params.toString() ? `?${params.toString()}` : ''}`;
  };

  // Check if any filters are applied
  const hasFilters = categoryFilter || imageTypeFilter || aiGeneratedFilter;

  // Type for items that will have user property
  type ItemWithUser = Prisma.ContributorItemGetPayload<{
    include: { user: { select: { id: true; name: true; email: true } } }
  }>;

  // Safe display of imageType and aiGeneratedStatus, accounting for potentially older records
  const getImageType = (item: ItemWithUser) => {
    // console.log('item.imageType :>> ', item.imageType);
    return item.imageType || 'JPG';
  };

  const isAiGenerated = (item: ItemWithUser) => {
    return item.aiGeneratedStatus === 'AI_GENERATED';
  };

  // Prepare filter data for client component
  const filterData = {
    categories: CATEGORIES,
    imageTypes: IMAGE_TYPES,
    aiStatus: AI_STATUS,
    activeFilters: {
      category: categoryFilter,
      imageType: imageTypeFilter,
      aiGenerated: aiGeneratedFilter
    },
    currentSearchQuery: normalizedSearchQuery,
    currentSort: sortOption
  };

  // Generate pagination range
  const generatePaginationRange = () => {
    const range: number[] = [];

    // Always show first page
    range.push(1);

    // Show ellipsis if needed
    if (currentPage > 3) {
      range.push(-1); // -1 represents ellipsis
    }

    // Add pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      range.push(i);
    }

    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      range.push(-1); // -1 represents ellipsis
    }

    // Always show last page if we have more than 1 page
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  const paginationRange = totalPages > 1 ? generatePaginationRange() : [];

  return (
    <div className="bg-black min-h-screen">
      {/* Full-width search bar */}
      <SearchBar />

      <div className="border-b border-gray-800/50">
        {/* We're removing the filter pills from here */}
      </div>

      {/* Add mobile filter toggle - visible only on mobile */}
      <div className="lg:hidden sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800/50 p-4">
        <MobileFilterToggle />
      </div>

      {/* Dark overlay for mobile when sidebar is open */}
      <MobileOverlay />

      <div className="flex flex-col lg:flex-row relative">
        {/* Modified filter sidebar with mobile visibility handled by client component */}
        <div className="w-full lg:w-80 lg:sticky lg:top-0 lg:self-start flex-shrink-0 hidden lg:block" id="filter-sidebar-container">
          <FilterSidebar
            filterData={filterData}
          />
        </div>

        {/* Main content / gallery grid */}
        <div className="flex-1 p-4">
          {/* Top bar with sort options and applied filters */}
          <div className="mb-6 flex flex-wrap justify-between items-center">
            {/* Sort buttons directly on background */}
            <div className="flex flex-wrap gap-3">
              {SORT_OPTIONS.map((option) => (
                <Link
                  key={option.value}
                  href={getFilterUrl('sort', option.value)}
                  className={`px-4 py-3 text-sm rounded-full transition-colors ${isFilterActive('sort', option.value)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>

            {/* Applied filters pills moved to top right */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2 items-center mt-3 lg:mt-0">
                {categoryFilter && (
                  <div className="text-gray-300 text-sm px-3 py-2.5 flex items-center gap-1 bg-gray-800/50 rounded-full">
                    <span>{CATEGORIES.find(c => c.value === categoryFilter)?.label || categoryFilter}</span>
                    <Link href={getFilterUrl('category', '')} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {imageTypeFilter && (
                  <div className="text-gray-300 text-sm px-3 py-2.5 flex items-center gap-1 bg-gray-800/50 rounded-full">
                    <span>{IMAGE_TYPES.find(t => t.value === imageTypeFilter)?.label || imageTypeFilter}</span>
                    <Link href={getFilterUrl('imageType', '')} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                {aiGeneratedFilter && (
                  <div className="text-gray-300 text-sm px-3 py-2.5 flex items-center gap-1 bg-gray-800/50 rounded-full">
                    <span>{AI_STATUS.find(s => s.value === aiGeneratedFilter)?.label || aiGeneratedFilter}</span>
                    <Link href={getFilterUrl('aiGenerated', '')} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                <Link
                  href={getClearFilterUrl()}
                  className="text-sm text-gray-400 hover:text-indigo-300 px-3 py-2.5 transition-colors rounded-full bg-gray-800/50"
                >
                  Clear filters
                </Link>
              </div>
            )}
          </div>

          {approvedItems.length > 0 ? (
            <>
              <div className="columns-1 sm:columns-2 md:col-3 lg:columns-4 2xl:columns-5 gap-6 space-y-6">
                {approvedItems.map((item: ItemWithUser) => (
                  <Link
                    href={`/gallery/${item.id}`}
                    key={item.id}
                    className="group block break-inside-avoid mb-6"
                  >
                    <div className="bg-gray-900/60 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all border border-gray-800/50 hover:border-indigo-500/50 relative">
                      <div className="relative w-full">
                        <ImageWithPattern
                          src={item.cleanPreviewUrl}
                          alt={item.title}
                          width={800}
                          height={800}
                          className="w-full transition-transform duration-500 group-hover:scale-110"
                          imageType={getImageType(item)}
                        />
                      </div>
                      {isAiGenerated(item) && (
                        <div className="absolute top-3 left-3 bg-purple-600/80 text-white text-xs py-0.5 px-2 rounded font-medium">
                          AI Generated
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-950 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <h3 className="text-white font-medium truncate">
                          {item.title}
                        </h3>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-sm text-gray-300">
                            By {item.user.name || item.user.email.split('@')[0]}
                          </p>
                          <div className="flex items-center gap-1 text-sm text-gray-400">
                            <span>{item.views || 0}</span>
                            <Eye className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center">
                  <nav className="flex items-center gap-1">
                    {/* Previous page button */}
                    <Link
                      href={currentPage > 1 ? getPaginationUrl(currentPage - 1) : '#'}
                      className={`flex items-center justify-center w-10 h-10 rounded-full ${currentPage > 1
                        ? 'text-white bg-gray-800 hover:bg-indigo-600 transition-colors'
                        : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'
                        }`}
                      aria-disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Link>

                    {/* Page numbers */}
                    {paginationRange.map((page, index) =>
                      page === -1 ? (
                        // Ellipsis
                        <span key={`ellipsis-${index}`} className="w-10 h-10 flex items-center justify-center text-gray-400">
                          ...
                        </span>
                      ) : (
                        // Page number
                        <Link
                          key={page}
                          href={getPaginationUrl(page)}
                          className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${currentPage === page
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-300 bg-gray-800 hover:bg-gray-700'
                            }`}
                        >
                          {page}
                        </Link>
                      )
                    )}

                    {/* Next page button */}
                    <Link
                      href={currentPage < totalPages ? getPaginationUrl(currentPage + 1) : '#'}
                      className={`flex items-center justify-center w-10 h-10 rounded-full ${currentPage < totalPages
                        ? 'text-white bg-gray-800 hover:bg-indigo-600 transition-colors'
                        : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'
                        }`}
                      aria-disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </nav>
                </div>
              )}

              {/* Results summary */}
              <div className="mt-6 text-center text-sm text-gray-500">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} images
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-indigo-900/20">
                <ImageIcon className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-medium text-white mb-3">No images found</h3>
              <p className="text-gray-400 mb-8 max-w-md text-center">
                {normalizedSearchQuery
                  ? `No results matching "${normalizedSearchQuery}"`
                  : "No images matching the selected filters"}
              </p>
              <Link
                href={getClearFilterUrl()}
                className="px-6 py-3 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/20"
              >
                Clear filters
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}