import { Sparkles, ArrowRight, Search, Download } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/prisma";
import { ImageWithPattern } from "@/components/ui/image-with-pattern";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

// Import SimpleCarousel dynamically to prevent hydration errors

const SimpleCarousel = dynamic(() => import("../../components/site/SimpleCarousel"), {
  ssr: true,
  loading: () => (
    <div className="relative overflow-hidden rounded-2xl bg-gray-900/60 border border-gray-800/50">
      <div className="h-[360px] md:h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    </div>
  )
});

// Define the interface locally
interface CarouselImage {
  id: string;
  imageUrl: string;
  previewUrl: string;
  title: string;
  imageType: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  views: number;
}

export default async function HomePage() {
  // Fetch approved contributor items
  let approvedItems: CarouselImage[] = [];
  try {
    const fetchedItems = await db.contributorItem.findMany({
      where: { 
        status: "APPROVED" 
      },
      orderBy: [
        { views: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 12, // Increased to have more items for the carousel
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
    
    // Validate received items and convert to CarouselImage type
    approvedItems = fetchedItems
      .filter(item => 
        item && item.imageUrl && typeof item.imageUrl === 'string' && 
        item.id && item.title
      )
      .map(item => ({
        id: item.id,
        imageUrl: item.imageUrl,
        previewUrl: item.previewUrl,
        title: item.title,
        imageType: item.imageType,
        user: {
          id: item.user.id,
          name: item.user.name,
          email: item.user.email
        },
        views: item.views
      }));
    
    console.log(`Loaded ${approvedItems.length} approved items for carousel`);
  } catch (error) {
    console.error("Error fetching approved items:", error);
    // Provide empty array if items couldn't be fetched
    approvedItems = [];
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero Section */}
      <div className="relative min-h-screen text-white overflow-hidden flex items-center">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          {/* Multi-layered gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-indigo-950/50 to-purple-950/30"></div>
          
          {/* Floating geometric shapes */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-lg animate-bounce" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-32 left-1/4 w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-md animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-20 right-1/3 w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full blur-lg animate-bounce" style={{ animationDelay: '0.5s' }}></div>
          
          {/* Animated grid pattern */}
          <div className="absolute inset-0 opacity-[0.02]">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          
          {/* Moving particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        </div>
        
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="flex items-center justify-center min-h-screen py-20 text-center">
            <div className="space-y-12 max-w-5xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 backdrop-blur-xl rounded-full px-6 py-3 border border-indigo-500/30 shadow-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-indigo-300 text-base font-medium">Live Creative Marketplace</span>
              </div>
              
              {/* Main heading */}
              <div className="space-y-6">
                <h1 className="text-6xl md:text-8xl font-bold leading-tight">
                  <span className="block bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-purple-300">
                    Find Your Perfect
                  </span>
                  <span className="block bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-pink-300 to-cyan-200">
                    Creative Asset
                  </span>
                </h1>
                
                <p className="text-2xl text-gray-300 leading-relaxed max-w-4xl mx-auto">
                  Search through millions of high-quality images, graphics, and digital assets from talented creators worldwide
                </p>
              </div>
              
              {/* Main Search Bar - Hero Element */}
              <div className="relative max-w-4xl mx-auto">
                {/* Search container with enhanced styling */}
                <div className="relative">
                  {/* Glow effect behind search */}
                  <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl"></div>
                  
                  <form action="/gallery" className="relative">
                    <div className="relative bg-white/5 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 group">
                      <div className="flex items-center p-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            name="q"
                            placeholder="Search for photos, illustrations, vectors, and more..."
                            className="w-full px-8 py-6 text-xl bg-transparent text-white placeholder-white/50 focus:outline-none focus:placeholder-white/30 transition-all duration-300"
                          />
                          
                          {/* Search suggestions */}
                          <div className="absolute left-8 top-full mt-2 text-sm text-white/40 hidden group-focus-within:block">
                            Popular: landscape, portrait, business, technology, nature
                          </div>
                        </div>
                        
                        <button
                          type="submit"
                          className="flex items-center gap-3 px-8 py-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 rounded-2xl text-white font-semibold text-lg shadow-lg hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 group"
                        >
                          <Search className="w-6 h-6" />
                          <span className="hidden sm:block">Search</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
                
                {/* Search stats */}
                <div className="flex justify-center items-center gap-8 mt-8 text-gray-400">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>50K+ Assets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <span>10K+ Creators</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Daily Updates</span>
                  </div>
                </div>
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
                <Link href="/contributor/upload" className="group">
                  <button className="relative px-10 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 rounded-2xl font-semibold text-white text-lg shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 hover:scale-105 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative flex items-center gap-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Start Selling Your Work
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                </Link>
                
                <Link href="/gallery" className="group">
                  <button className="px-10 py-5 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-2xl font-semibold text-white text-lg transition-all duration-300 hover:scale-105">
                    <span className="flex items-center gap-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Browse Gallery
                    </span>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Featured Carousel Section */}
      <section className="py-20 bg-gradient-to-b from-gray-950 to-gray-900/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-[0.02]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 backdrop-blur-xl rounded-full px-4 py-2 border border-indigo-500/30 shadow-lg mb-6">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-indigo-300 text-sm font-medium">Featured Content</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-purple-300">
                Trending Now
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Discover the most popular and recently featured content from our talented community
            </p>
          </div>
          
          {/* Modern Carousel */}
          <div className="relative">
            <SimpleCarousel items={approvedItems} />
          </div>
        </div>
      </section>
      
      {/* Popular Resources */}
      <section className="py-20 bg-gradient-to-b from-gray-950 to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <div className="text-sm font-medium text-indigo-400 mb-2">TRENDING NOW</div>
              <h2 className="text-3xl font-bold text-white">Popular Resources</h2>
              <p className="mt-4 text-lg text-gray-400">
                Discover trending assets our community loves
              </p>
            </div>
            <Link href="/gallery" className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center px-4 py-2 rounded-lg border border-gray-800 bg-gray-900/50 transition-colors group">
              View all <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform"/>
            </Link>
          </div>
          
          {approvedItems.length > 0 ? (
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
              {approvedItems.slice(0, 20).map((item, index) => {
                // Create varying heights for better masonry effect
                const aspectRatio = [
                  'aspect-square', // 1:1
                  'aspect-[3/4]',  // Portrait
                  'aspect-[4/3]',  // Landscape
                  'aspect-[2/3]',  // Tall portrait
                  'aspect-[16/9]'  // Widescreen
                ][index % 5];
                
                // Staggered animation delay based on index
                const animationDelay = `${(index % 6) * 0.05}s`;

                return (
                  <div 
                    key={item.id} 
                    className="break-inside-avoid mb-6 transform hover:-translate-y-1 transition-all duration-300 opacity-0 animate-fade-in"
                    style={{ animationDelay, animationFillMode: 'forwards' }}
                  >
                    <div className="group rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all bg-gray-900/60 border border-gray-800/50 hover:border-indigo-500/50 backdrop-blur-sm">
                      <Link 
                        href={`/gallery/${item.id}`} 
                        className="block relative overflow-hidden" 
                      >
                        <div className={`${aspectRatio} w-full relative`}>
                          {/* Add checkered background for PNG images */}
                          {item.imageType?.toUpperCase() === 'PNG' && (
                            <div className="absolute inset-0 bg-[url('/transparent-checkerboard.svg')] bg-repeat bg-[length:20px_20px] opacity-10"></div>
                          )}
                          <Image 
                            src={item.previewUrl || item.imageUrl}
                            alt={item.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out pointer-events-none"
                            unoptimized={true}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-0 group-hover:opacity-80 transition-opacity duration-300"/>
                          
                          {/* Image type badge */}
                          {item.imageType && (
                            <div className={`absolute top-2 left-2 ${
                              item.imageType.toUpperCase() === 'PNG' 
                                ? 'bg-indigo-900/70 text-indigo-300' 
                                : 'bg-gray-900/70 text-gray-300'
                              } text-xs py-0.5 px-2 rounded-md backdrop-blur-sm flex items-center gap-1`}>
                              {item.imageType.toUpperCase() === 'PNG' && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 12h16M4 19h16" />
                                </svg>
                              )}
                              {item.imageType}
                            </div>
                          )}
                          
                          <div className="absolute bottom-3 right-3 bg-indigo-600 rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 hover:bg-indigo-500">
                            <Download className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </Link>
                      <div className="p-4">
                        <h3 className="font-medium text-white group-hover:text-indigo-400 transition-colors truncate">
                          {item.title}
                        </h3>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-sm text-gray-400 truncate max-w-[150px]">
                            By <Link href={`/creator/${item.user.id}`} className="hover:text-indigo-400 hover:underline">
                              {item.user.name || item.user.email.split('@')[0]}
                            </Link>
                          </p>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <span>{item.views || 0}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path d="M12 9.5a2.5 2.5 0 0 0 0 5 2.5 2.5 0 0 0 0-5z"/>
                              <path d="M12 15a5.5 5.5 0 0 1-5.5-5.5 5.5 5.5 0 0 1 11 0A5.5 5.5 0 0 1 12 15zm0-13C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-900/50 rounded-xl border border-gray-800 p-8">
              <p className="text-gray-400">No approved images available yet.</p>
              <Link href="/contributor/upload" className="mt-4 text-indigo-400 hover:text-indigo-300 hover:underline inline-block">
                Submit your content
              </Link>
            </div>
          )}
        </div>
      </section>
      
      {/* Call to action */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gray-900"></div>
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500 rounded-full filter blur-[120px] opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-purple-500 rounded-full filter blur-[120px] opacity-15"></div>
        </div>
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-10 shadow-xl">
            <div className="inline-flex items-center gap-2 bg-indigo-900/40 rounded-full px-4 py-1 border border-indigo-700/30 mb-6">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-indigo-300 text-sm font-medium">Unlock your creative potential</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to create something amazing?</h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Join our community of creators and discover premium resources for your next project
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="group">
                <Button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all">
                  Sign up for free
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/gallery" className="group">
                <Button variant="outline" className="w-full sm:w-auto px-8 py-4 bg-transparent text-white hover:bg-gray-800 border-gray-700 hover:border-gray-600 rounded-xl font-medium transition-colors">
                  Explore resources
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}