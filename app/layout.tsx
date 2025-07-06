import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { Toaster } from "react-hot-toast";
import ClientOnly from "@/components/contributor/ClientOnly";

const figtree = Figtree({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "KlickStock - Premium Creative Resources & Digital Assets",
    template: "%s | KlickStock"
  },
  description: "Discover high-quality images, graphics, and digital assets for your creative projects. Browse thousands of premium resources including photos, vectors, illustrations, and more on Klick Stock.",
  keywords: [
    "stock photos",
    "digital assets",
    "creative resources",
    "graphics",
    "illustrations",
    "vectors",
    "design assets",
    "premium images",
    "royalty free",
    "creative content",
    "photography",
    "digital art"
  ],
  authors: [{ name: "Klick Stock Team" }],
  creator: "Klick Stock",
  publisher: "Klick Stock",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://klickstock.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://klickstock.com",
    siteName: "Klick Stock",
    title: "Klick Stock - Premium Creative Resources & Digital Assets",
    description: "Discover high-quality images, graphics, and digital assets for your creative projects. Browse thousands of premium resources on Klick Stock.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Klick Stock - Premium Creative Resources",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Klick Stock - Premium Creative Resources & Digital Assets",
    description: "Discover high-quality images, graphics, and digital assets for your creative projects.",
    images: ["/og-image.jpg"],
    creator: "@klickstock",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
    yahoo: "your-yahoo-verification-code",
  },
  category: "technology",
  classification: "Creative Resources Platform",
  referrer: "origin-when-cross-origin",

  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#5bbad5",
      },
    ],
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "https://klickstock.com",
    languages: {
      "en-US": "https://klickstock.com",
    },
  },
  other: {
    "application-name": "Klick Stock",
    "mobile-web-app-capable": "yes",
    "mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Klick Stock",
    "msapplication-TileColor": "#2563eb",
    "msapplication-config": "/browserconfig.xml",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  colorScheme: "dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${figtree.variable} antialiased bg-gray-950 text-gray-100`}
        style={{ fontFamily: figtree.style.fontFamily }}
      >
        <ClientOnly>
          <Providers>{children}</Providers>
          <Toaster />
        </ClientOnly>
      </body>
    </html>
  );
}
