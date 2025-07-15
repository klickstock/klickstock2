import { NextResponse } from 'next/server'
import { db } from '@/lib/prisma'

export async function GET() {
  const baseUrl = 'https://klickstock.com'

  // Static routes
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: '1.0',
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: '0.9',
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: '0.8',
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: '0.8',
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: '0.7',
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: '0.7',
    },
    {
      url: `${baseUrl}/contributor`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: '0.6',
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'yearly',
      priority: '0.3',
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'yearly',
      priority: '0.3',
    },
    {
      url: `${baseUrl}/license`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'yearly',
      priority: '0.3',
    },
    {
      url: `${baseUrl}/careers`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: '0.5',
    },
    {
      url: `${baseUrl}/support`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: '0.5',
    },
    {
      url: `${baseUrl}/sitemap`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: '0.4',
    },
  ]

  try {
    // Dynamic routes for approved contributor items
    const approvedItems = await db.contributorItem.findMany({
      where: {
        status: "APPROVED"
      },
      select: {
        id: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 1000, // Limit to prevent overly large sitemaps
    })

    const dynamicRoutes = approvedItems.map((item) => ({
      url: `${baseUrl}/gallery/${item.id}`,
      lastModified: item.updatedAt.toISOString(),
      changeFrequency: 'weekly',
      priority: '0.6',
    }))

    const allRoutes = [...staticRoutes, ...dynamicRoutes]

    // Generate XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes
        .map(
          (route) => `  <url>
    <loc>${route.url}</loc>
    <lastmod>${route.lastModified}</lastmod>
    <changefreq>${route.changeFrequency}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
        )
        .join('\n')}
</urlset>`

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Error generating sitemap:', error)

    // Return basic sitemap with static routes only
    const basicSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticRoutes
        .map(
          (route) => `  <url>
    <loc>${route.url}</loc>
    <lastmod>${route.lastModified}</lastmod>
    <changefreq>${route.changeFrequency}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
        )
        .join('\n')}
</urlset>`

    return new NextResponse(basicSitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    })
  }
} 