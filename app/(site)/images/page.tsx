// @/app/images/page.tsx

import { ImageWithPattern } from "@/components/ui/image-with-pattern";
import { aiGenerationOptions, categoryOptions } from "@/lib/constants";
import { db } from "@/lib/prisma";
import { ChevronDown, Download, Eye, X, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { Prisma } from "@prisma/client";
import Image from "next/image";
import { MobileFilterToggle } from "@/components/gallery/MobileFilterToggle";
import { MobileOverlay } from "@/components/gallery/MobileOverlay";


// Import components dynamically
const FilterSidebar = dynamic(() => import("../../../components/gallery/FilterSidebar"), {
  ssr: true
});

const SearchBar = dynamic(() => import("../../../components/gallery/SearchBar").then(mod => mod.SearchBar), {
  ssr: true
});

// Filter options
const CATEGORIES = categoryOptions;
const AI_STATUS = aiGenerationOptions;

const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "downloads", label: "Most Downloaded" },
];

// Items per page
const ITEMS_PER_PAGE = 50;

export default async function ImagesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  // Use the search params directly since they are properly typed
  const searchQuery = resolvedSearchParams.q || "";
  const categoryFilter = resolvedSearchParams.category as string || "";
  const aiGeneratedFilter = resolvedSearchParams.aiGenerated as string || "";
  const sortOption = resolvedSearchParams.sort as string || "popular";
  const currentPage = Number(resolvedSearchParams.page as string) || 1;

  // Ensure searchQuery is a string (not an array)
  const normalizedSearchQuery = Array.isArray(searchQuery) ? searchQuery[0] || "" : searchQuery;

  // Always filter for JPG images
  const imageTypeFilter = "JPG";

  // Build the where clause
  const whereClause: Prisma.ContributorItemWhereInput = {
    status: "APPROVED",
    imageType: "JPG"
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
    if (aiGeneratedFilter && paramName !== 'aiGenerated') params.set('aiGenerated', aiGeneratedFilter);
    if (sortOption && paramName !== 'sort') params.set('sort', sortOption);

    // Add or remove the selected filter
    if (paramName === 'category' && categoryFilter !== value) params.set('category', value);
    if (paramName === 'aiGenerated' && aiGeneratedFilter !== value) params.set('aiGenerated', value);
    if (paramName === 'sort' && sortOption !== value) params.set('sort', value);

    // Reset to page 1 when changing filters
    if (paramName !== 'page') {
      params.set('page', '1');
    } else if (value) {
      params.set('page', value);
    }
    return `/images?${params.toString()}`;
  };

  // Function to get pagination URL
  const getPaginationUrl = (page: number) => {
    return getFilterUrl('page', page.toString());
  };

  // Function to check if a filter is active
  const isFilterActive = (paramName: string, value: string) => {
    if (paramName === 'category') return categoryFilter === value;
    if (paramName === 'aiGenerated') return aiGeneratedFilter === value;
    if (paramName === 'sort') return sortOption === value;
    return false;
  };

  // Function to get a clear filter URL
  const getClearFilterUrl = () => {
    const params = new URLSearchParams();
    if (normalizedSearchQuery) params.set('q', normalizedSearchQuery);
    return `/images${params.toString() ? `?${params.toString()}` : ''}`;
  };

  // Check if any filters are applied
  const hasFilters = categoryFilter || aiGeneratedFilter;

  // Type for items that will have user property
  type ItemWithUser = Prisma.ContributorItemGetPayload<{
    include: { user: { select: { id: true; name: true; email: true } } }
  }>;

  // Safe display of imageType and aiGeneratedStatus
  const getImageType = (item: ItemWithUser) => item.imageType || 'JPG';
  const isAiGenerated = (item: ItemWithUser) => item.aiGeneratedStatus === 'AI_GENERATED';

  // Prepare filter data for client component
  const filterData = {
    categories: CATEGORIES,
    imageTypes: [],
    aiStatus: AI_STATUS,
    activeFilters: {
      category: categoryFilter,
      imageType: "JPG",
      aiGenerated: aiGeneratedFilter
    },
    currentSearchQuery: normalizedSearchQuery,
    currentSort: sortOption
  };

  // Generate pagination range
  const generatePaginationRange = () => {
    const range: (number | string)[] = [];
    const dots = '...';
    if (totalPages <= 1) return [];

    range.push(1);

    if (currentPage > 3) {
      range.push(dots);
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      range.push(i);
    }

    if (currentPage < totalPages - 2) {
      range.push(dots);
    }

    if (totalPages > 1) {
      range.push(totalPages);
    }

    return [...new Set(range)]; // Remove duplicates if any
  };

  const paginationRange = generatePaginationRange();

  return (
    <div className="bg-black min-h-screen">
      {/* Full-width search bar */}
      <SearchBar />

      <div className="border-b border-gray-800/50"></div>

      {/* Add mobile filter toggle - visible only on mobile */}
      <div className="lg:hidden sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800/50 p-4">
        <MobileFilterToggle />
      </div>

      {/* Dark overlay for mobile when sidebar is open */}
      <MobileOverlay />

      <div className="flex flex-col lg:flex-row relative">
        {/* Modern collapsible filters sidebar - sticky with no gap */}
        <div className="w-full lg:w-80 lg:sticky lg:top-0 lg:self-start flex-shrink-0 hidden lg:block" id="filter-sidebar-container">
          <FilterSidebar
            filterData={filterData}
          />
        </div>

        {/* Main content / gallery grid */}
        <div className="flex-1 p-4">
          {/* Top bar with sort options and applied filters */}
          <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
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
              <div className="flex flex-wrap gap-2 items-center">
                {categoryFilter && (
                  <div className="text-gray-300 text-sm px-3 py-2.5 flex items-center gap-1 bg-gray-800/50 rounded-full">
                    <span>{CATEGORIES.find(c => c.value === categoryFilter)?.label || categoryFilter}</span>
                    <Link href={getFilterUrl('category', '')} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></Link>
                  </div>
                )}
                {aiGeneratedFilter && (
                  <div className="text-gray-300 text-sm px-3 py-2.5 flex items-center gap-1 bg-gray-800/50 rounded-full">
                    <span>{AI_STATUS.find(s => s.value === aiGeneratedFilter)?.label || aiGeneratedFilter}</span>
                    <Link href={getFilterUrl('aiGenerated', '')} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></Link>
                  </div>
                )}
                <Link href={getClearFilterUrl()} className="text-sm text-gray-400 hover:text-indigo-300 px-3 py-2.5 transition-colors rounded-full bg-gray-800/50">
                  Clear filters
                </Link>
              </div>
            )}
          </div>

          {/* Image grid */}
          {approvedItems.length > 0 ? (
            <>
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-6 space-y-6">
                {approvedItems.map((item) => (
                  <Link
                    href={`/gallery/${item.id}`}
                    key={item.id}
                    className="group block break-inside-avoid"
                  >
                    <div className="bg-gray-900/30 rounded-xl overflow-hidden border border-gray-800/50 hover:border-indigo-500/40 transition-all duration-200 relative">
                      <div className="relative w-full">
                        {/* ====================================================================== */}
                        {/* ======================= THE CRITICAL CHANGE HERE ======================= */}
                        {/* ====================================================================== */}
                        <ImageWithPattern
                          src={item.cleanPreviewUrl || item.previewUrl}
                          alt={item.title}
                          width={800}
                          height={800}
                          className="w-full transition-transform duration-500 group-hover:scale-105"
                          imageType={getImageType(item)}
                        />
                      </div>
                      {isAiGenerated(item) && (
                        <div className="absolute top-3 left-3 bg-purple-600/80 text-white text-xs py-0.5 px-2 rounded font-medium">
                          AI Generated
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <h3 className="text-white font-medium truncate">{item.title}</h3>
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-xs text-white/80 truncate max-w-[60%]">
                            By {item.user.name || item.user.email.split('@')[0]}
                          </div>
                          <div className="flex items-center text-xs text-white/80">
                            <Eye className="w-3 h-3 mr-1" />
                            <span>{item.views}</span>
                            <Download className="w-3 h-3 ml-2 mr-1" />
                            <span>{item.downloads}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {paginationRange.length > 0 && (
                <div className="flex justify-center mt-12 mb-6">
                  <nav className="flex items-center gap-1">
                    <Link href={currentPage > 1 ? getPaginationUrl(currentPage - 1) : '#'} className={`flex items-center justify-center w-10 h-10 rounded-full ${currentPage > 1 ? 'text-white bg-gray-800 hover:bg-indigo-600 transition-colors' : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'}`} aria-disabled={currentPage <= 1}>
                      <ChevronLeft className="w-5 h-5" />
                    </Link>
                    {paginationRange.map((page, i) =>
                      page === '...' ? (
                        <span key={`ellipsis-${i}`} className="w-10 h-10 flex items-center justify-center text-gray-400">...</span>
                      ) : (
                        <Link key={page} href={getPaginationUrl(page as number)} className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${currentPage === page ? 'bg-indigo-600 text-white' : 'text-gray-300 bg-gray-800 hover:bg-gray-700'}`}>
                          {page}
                        </Link>
                      )
                    )}
                    <Link href={currentPage < totalPages ? getPaginationUrl(currentPage + 1) : '#'} className={`flex items-center justify-center w-10 h-10 rounded-full ${currentPage < totalPages ? 'text-white bg-gray-800 hover:bg-indigo-600 transition-colors' : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'}`} aria-disabled={currentPage >= totalPages}>
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </nav>
                </div>
              )}
              <div className="mt-6 text-center text-sm text-gray-500">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} images
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-indigo-900/20">
                <ImageIcon className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-medium text-white mb-3">No Images Found</h3>
              <p className="text-gray-400 mb-8 max-w-md text-center">
                {normalizedSearchQuery ? `No results matching "${normalizedSearchQuery}"` : "No images matching the selected filters"}
              </p>
              <Link href={getClearFilterUrl()} className="px-6 py-3 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/20">
                Clear filters
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}