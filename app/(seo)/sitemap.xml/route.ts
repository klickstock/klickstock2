import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { ContributorItemStatus } from '@prisma/client';

const baseUrl = 'https://klickstock.com';
// A safe, standard number of items per sitemap file. Max is 50,000.
const ITEMS_PER_SITEMAP = 10000;

export async function GET() {
  try {
    // 1. Fetch the total count of approved items to calculate how many sitemap pages we need.
    const totalItems = await db.contributorItem.count({
      where: {
        status: ContributorItemStatus.APPROVED,
      },
    });

    // 2. Determine the number of paginated item sitemaps required.
    const numberOfItemSitemaps = Math.ceil(totalItems / ITEMS_PER_SITEMAP);

    // 3. Create an array of URLs for each dynamic "items" sitemap page.
    // e.g., ['.../sitemaps/items-1.xml', '.../sitemaps/items-2.xml']
    const itemSitemapUrls = Array.from({ length: numberOfItemSitemaps }, (_, i) => {
      return `${baseUrl}/sitemaps/items-${i + 1}.xml`;
    });

    // 4. Combine the static sitemap with all the dynamic item sitemaps.
    const sitemaps = [
      `${baseUrl}/sitemaps/static.xml`,
      ...itemSitemapUrls
    ];

    // 5. Find the most recently updated item. This is the <lastmod> date for the whole index.
    const lastUpdatedItem = await db.contributorItem.findFirst({
      where: { status: ContributorItemStatus.APPROVED },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    const lastMod = lastUpdatedItem?.updatedAt.toISOString() || new Date().toISOString();

    // 6. Generate the XML for the sitemap index file.
    const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
        .map(
          (url) => `  <sitemap>
    <loc>${url}</loc>
    <lastmod>${lastMod}</lastmod>
  </sitemap>`
        )
        .join('\n')}
</sitemapindex>`;

    return new NextResponse(sitemapIndexXml, {
      headers: {
        'Content-Type': 'application/xml',
        // Cache for 24 hours
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });

  } catch (error) {
    console.error('Fatal error generating sitemap index:', error);
    // Return a 500 status but with a null body and the correct XML content type.
    // This prevents Google from parsing an HTML error page and clarifies that the server
    // failed to build the sitemap, which is a more accurate error report.
    return new NextResponse(null, {
      status: 500,
      headers: {
        'Content-Type': 'application/xml',
      }
    });
  }
}