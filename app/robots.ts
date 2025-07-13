import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://klickstock.com';

    return {
        rules: [
            {
                userAgent: '*',
                // By default, we allow all crawling. The rules below specify exceptions.
                allow: '/',
                disallow: [
                    // --- Admin & Protected Routes ---
                    '/admin/',
                    '/sadmin/',
                    '/profile/',
                    '/contributor/',
                    '/auth/',

                    // --- API & Internal Routes ---
                    '/api/',
                    '/_next/data/', // A best practice for Next.js

                    '/gallery?*',
                    '/search?*',
                ],
            },
        ],
        // Point crawlers to your main sitemap index file.
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}