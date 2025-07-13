import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { ContributorItemStatus } from '@prisma/client';

const baseUrl = 'https://klickstock.com';
const ITEMS_PER_SITEMAP = 10000; // Must be the same as in the index file

// Your static routes, kept in one place for easy management.
const staticRoutes = [
  { url: baseUrl, lastModified: new Date().toISOString(), changeFrequency: 'daily', priority: '1.0' },
  { url: `${baseUrl}/gallery`, lastModified: new Date().toISOString(), changeFrequency: 'daily', priority: '0.9' },
  { url: `${baseUrl}/about`, lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: '0.8' },
  { url: `${baseUrl}/pricing`, lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: '0.8' },
  { url: `${baseUrl}/contact`, lastModified: new Date().toISOString(), changeFrequency: 'monthly', priority: '0.7' },
  { url: `${baseUrl}/blog`, lastModified: new Date().toISOString(), changeFrequency: 'weekly', priority: '0.7' },
  { url: `${baseUrl}/terms`, lastModified: new Date().toISOString(), changeFrequency: 'yearly', priority: '0.3' },
  { url: `${baseUrl}/privacy`, lastModified: new Date().toISOString(), changeFrequency: 'yearly', priority: '0.3' },
];

// Helper function to generate the final XML string from a list of routes.
function generateSitemapXml(routes: typeof staticRoutes): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
      .map(
        (route) => `  <url>
    <loc>${route.url}</loc>
    <lastmod>${route.lastModified}</lastmod>
    <changefreq>${route.changeFrequency}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
      )
      .join('\n')}
</urlset>`;
}


export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  // Case 1: Generate the sitemap for your static pages.
  if (slug === 'static.xml') {
    const sitemap = generateSitemapXml(staticRoutes);
    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  }

  // Case 2: Generate the sitemap for a specific page of gallery items.
  const match = slug.match(/^items-(\d+)\.xml$/);
  if (match) {
    const page = parseInt(match[1], 10);
    if (isNaN(page) || page < 1) {
      return new NextResponse('Not Found: Invalid page number', { status: 404 });
    }

    try {
      // Fetch the correct chunk of items from the database using pagination.
      const items = await db.contributorItem.findMany({
        where: { status: ContributorItemStatus.APPROVED },
        select: { id: true, updatedAt: true },
        orderBy: { createdAt: 'desc' }, // Use a consistent order!
        skip: (page - 1) * ITEMS_PER_SITEMAP,
        take: ITEMS_PER_SITEMAP,
      });

      // If a crawler requests a page that doesn't exist, return a 404.
      if (items.length === 0) {
        return new NextResponse('Not Found', { status: 404 });
      }

      // Map the database items to the correct URL structure.
      const itemRoutes = items.map((item) => ({
        url: `${baseUrl}/gallery/${item.id}`, // <-- This now correctly uses the item ID
        lastModified: item.updatedAt.toISOString(),
        changeFrequency: 'weekly',
        priority: '0.6',
      }));

      const sitemap = generateSitemapXml(itemRoutes);
      return new NextResponse(sitemap, {
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      });

    } catch (error) {
      console.error(`Error generating sitemap for items page ${page}:`, error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  }

  // If the slug doesn't match 'static.xml' or 'items-N.xml', it's an invalid sitemap.
  return new NextResponse('Not Found', { status: 404 });
}