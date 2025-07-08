import { ImageWithPattern } from "@/components/ui/image-with-pattern";
import { aiGenerationOptions, categoryOptions } from "@/lib/constants";
import { db } from "@/lib/prisma";
import { ChevronDown, Download, Eye } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { Prisma } from "@prisma/client";
import Image from "next/image";

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

export default async function ImagesPage({
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

  // Always filter for JPG images
  const imageTypeFilter = "JPG";

  // Build the where clause
  const whereClause: Prisma.ContributorItemWhereInput = {
    status: "APPROVED",
    imageType: "JPG"
  };

  // Add search query filter if provided
  if (searchQuery) {
    whereClause.OR = [
      { title: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } },
      { tags: { has: searchQuery } }
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

    if (searchQuery) params.set('q', searchQuery as string);
    if (categoryFilter && paramName !== 'category') params.set('category', categoryFilter as string);
    if (aiGeneratedFilter && paramName !== 'aiGenerated') params.set('aiGenerated', aiGeneratedFilter as string);
    if (sortOption && paramName !== 'sort') params.set('sort', sortOption as string);

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
    if (searchQuery) params.set('q', searchQuery as string);
    return `/images${params.toString() ? `?${params.toString()}` : ''}`;
  };

  // Check if any filters are applied
  const hasFilters = categoryFilter || imageTypeFilter || aiGeneratedFilter;

  // Type for items that will have user property
  type ItemWithUser = Prisma.ContributorItemGetPayload<{
    include: { user: { select: { id: true; name: true; email: true } } }
  }>;

  // Safe display of imageType and aiGeneratedStatus, accounting for potentially older records
  const getImageType = (item: ItemWithUser) => {
    return item.imageType || 'JPG';
  };

  const isAiGenerated = (item: ItemWithUser) => {
    return item.aiGeneratedStatus === 'AI_GENERATED';
  };

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
    currentSearchQuery: searchQuery,
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

      <div className="flex flex-col lg:flex-row relative">
        {/* Modern collapsible filters sidebar - sticky with no gap */}
        <div className="w-full lg:w-80 lg:sticky lg:top-0 lg:self-start flex-shrink-0">
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
                    : 'bg-gray-900/80 border border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                    }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>

            {/* Results count */}
            <div className="text-gray-400 text-sm">
              {totalItems} JPG {totalItems === 1 ? 'image' : 'images'} found
            </div>
          </div>

          {/* Image grid */}
          {approvedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center bg-gray-900/30 border border-gray-800/50 rounded-xl p-12 mt-10">
              <div className="text-xl text-gray-400 mb-4">No images found</div>
              <div className="text-gray-500">Try adjusting your filters or search query</div>
              <Link href="/images" className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
              {approvedItems.map((item) => (
                <Link
                  href={`/gallery/${item.id}`}
                  key={item.id}
                  className="group block break-inside-avoid"
                >
                  <div className="bg-gray-900/30 rounded-xl overflow-hidden border border-gray-800/50 hover:border-indigo-500/40 transition-all duration-200 relative">
                    <div className="relative w-full">
                      <ImageWithPattern
                        src={item.imageUrl}
                        alt={item.title}
                        width={800}
                        height={800}
                        className="w-full transition-transform duration-500 group-hover:scale-105"
                        imageType={getImageType(item)}
                      />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <h3 className="text-white font-medium truncate">{item.title}</h3>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-white/80 truncate max-w-[60%]">
                          {item.user.name || item.user.email.split('@')[0]}
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
          )}

          {/* Pagination */}
          {paginationRange.length > 0 && (
            <div className="flex justify-center mt-12 mb-6">
              <div className="flex items-center gap-2">
                {/* Previous page button */}
                <Link
                  href={currentPage > 1 ? getPaginationUrl(currentPage - 1) : '#'}
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${currentPage > 1
                    ? 'bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-gray-300'
                    : 'bg-gray-900/40 border border-gray-800/50 text-gray-700 cursor-not-allowed'
                    }`}
                  aria-disabled={currentPage <= 1}
                  tabIndex={currentPage <= 1 ? -1 : undefined}
                >
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </Link>

                {/* Page numbers */}
                {paginationRange.map((page, i) =>
                  page === -1 ? (
                    // Ellipsis
                    <span key={`ellipsis-${i}`} className="flex items-center justify-center w-10 h-10 text-gray-600">
                      ...
                    </span>
                  ) : (
                    // Page number
                    <Link
                      key={page}
                      href={getPaginationUrl(page)}
                      className={`flex items-center justify-center w-10 h-10 rounded-full ${currentPage === page
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-gray-300'
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
                    ? 'bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-gray-300'
                    : 'bg-gray-900/40 border border-gray-800/50 text-gray-700 cursor-not-allowed'
                    }`}
                  aria-disabled={currentPage >= totalPages}
                  tabIndex={currentPage >= totalPages ? -1 : undefined}
                >
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 