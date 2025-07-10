// @/app/pngs/page.tsx

import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/prisma";
import { Download, Eye, Search, Filter, ChevronDown, CheckCircle2, SlidersHorizontal, Image as ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
import { ImageWithPattern } from "@/components/ui/image-with-pattern";
import { categoryOptions, aiGenerationOptions } from "@/lib/constants";
import dynamic from "next/dynamic";

import { Prisma } from "@prisma/client";
import { MobileFilterToggle } from "@/components/gallery/MobileFilterToggle";
import { MobileOverlay } from "@/components/gallery/MobileOverlay";

// Import components dynamically to match gallery page
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

export default async function PngsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  // Use the search params directly since they are properly typed
  const searchQuery = resolvedSearchParams.q as string || "";
  const categoryFilter = resolvedSearchParams.category as string || "";
  const aiGeneratedFilter = resolvedSearchParams.aiGenerated as string || "";
  const sortOption = resolvedSearchParams.sort as string || "popular";
  const currentPage = Number(resolvedSearchParams.page as string) || 1;

  // Always filter for PNG images
  const imageTypeFilter = "PNG";
  const normalizedSearchQuery = Array.isArray(searchQuery) ? searchQuery[0] || "" : searchQuery;

  // Build the where clause
  const whereClause: Prisma.ContributorItemWhereInput = {
    status: "APPROVED",
    imageType: "PNG"
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

    return `/pngs?${params.toString()}`;
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
    return `/pngs${params.toString() ? `?${params.toString()}` : ''}`;
  };

  // Check if any filters are applied
  const hasFilters = categoryFilter || aiGeneratedFilter;

  // Type for items that will have user property
  type ItemWithUser = Prisma.ContributorItemGetPayload<{
    include: { user: { select: { id: true; name: true; email: true } } }
  }>;

  // Safe display of imageType and aiGeneratedStatus, accounting for potentially older records
  const getImageType = (item: ItemWithUser) => {
    return item.imageType || 'PNG';
  };

  const isAiGenerated = (item: ItemWithUser) => {
    return item.aiGeneratedStatus === 'AI_GENERATED';
  };

  // Prepare filter data for client component
  const filterData = {
    categories: CATEGORIES,
    imageTypes: [], // Hide image type filter as it's fixed to PNG
    aiStatus: AI_STATUS,
    activeFilters: {
      category: categoryFilter,
      imageType: "PNG",
      aiGenerated: aiGeneratedFilter
    },
    currentSearchQuery: normalizedSearchQuery,
    currentSort: sortOption
  };

  // Generate pagination range
  const generatePaginationRange = () => {
    const range: (number | string)[] = [];
    const dots = '...';

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    range.push(1);

    if (currentPage > 3) {
      range.push(dots);
    }

    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    for (let i = startPage; i <= endPage; i++) {
      range.push(i);
    }

    if (currentPage < totalPages - 2) {
      range.push(dots);
    }

    range.push(totalPages);

    // Quick fix for duplicate dots
    return [...new Set(range)];
  };

  const paginationRange = totalPages > 1 ? generatePaginationRange() : [];


  return (
    <div className="bg-black min-h-screen">
      {/* Full-width search bar */}
      <SearchBar />

      <div className="border-b border-gray-800/50">
        {/* Empty container */}
      </div>

      {/* Mobile filter toggle */}
      <div className="lg:hidden sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800/50 p-4">
        <MobileFilterToggle />
      </div>
      <MobileOverlay />

      <div className="flex flex-col lg:flex-row relative">
        {/* Sidebar */}
        <div className="w-full lg:w-80 lg:sticky lg:top-0 lg:self-start flex-shrink-0 hidden lg:block" id="filter-sidebar-container">
          <FilterSidebar
            filterData={filterData}
          />
        </div>

        {/* Main content / gallery grid */}
        <div className="flex-1 p-4">
          {/* Top bar with sort options and applied filters */}
          <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
            {/* Sort buttons */}
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

            {/* Results count and filter pills */}
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
                        <div className="absolute inset-0 bg-[url('/transparent-checkerboard.svg')] bg-repeat bg-[length:20px_20px] opacity-10"></div>
                        {/* ====================================================================== */}
                        {/* ======================= THE CRITICAL CHANGE HERE ======================= */}
                        {/* ====================================================================== */}
                        <ImageWithPattern
                          src={item.previewUrl}
                          alt={item.title}
                          width={800}
                          height={800}
                          className="w-full relative z-10 transition-transform duration-500 group-hover:scale-105"
                          imageType={"PNG"}
                        />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
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
              <h3 className="text-2xl font-medium text-white mb-3">No PNGs Found</h3>
              <p className="text-gray-400 mb-8 max-w-md text-center">
                {searchQuery ? `No results matching "${searchQuery}"` : "No PNGs matching the selected filters"}
              </p>
              <Link href={getClearFilterUrl()} className="px-6 py-3 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/20">
                Clear filters & search
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}