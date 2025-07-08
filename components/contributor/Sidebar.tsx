"use client";

import React, { useState, useEffect, JSX, Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  ArrowUpTrayIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  CameraIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  DocumentIcon,
  Bars3Icon,
  XMarkIcon
} from "@heroicons/react/24/solid";

/**
 * A custom hook to safely check for a media query match, preventing hydration errors.
 * It defaults to `false` on the server and during the initial client render.
 * @param query The media query string (e.g., '(min-width: 1024px)')
 * @returns `true` if the media query matches, otherwise `false`.
 */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // This code only runs on the client, after hydration
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);

  return matches;
}


export const Sidebar = () => {
  const pathname = usePathname();
  const [counts, setCounts] = useState({
    drafts: 0,
    pending: 0,
    rejected: 0,
    approved: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // This custom hook safely determines if we're on a desktop-sized screen.
  // It will be `false` on the server and on the initial client render, then update.
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    // Fetch the counts from the server
    const fetchCounts = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/contributor/counts');
        if (response.ok) {
          const data = await response.json();
          setCounts({
            drafts: data.drafts || 0,
            pending: data.pending || 0,
            rejected: data.rejected || 0,
            approved: data.approved || 0
          });
        }
      } catch (error) {
        console.error("Failed to fetch counts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close the mobile menu when a route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isMobileMenuOpen]);

  const generalItems = [
    { label: "Dashboard", href: "/contributor", icon: <HomeIcon className="w-5 h-5" /> },
    { label: "Upload Files", href: "/contributor/upload", icon: <ArrowUpTrayIcon className="w-5 h-5" /> }
  ];

  const contentItems = [
    // { label: "Upload", href: "/contributor/drafts", icon: <DocumentIcon className="w-5 h-5" />, count: counts.drafts },
    { label: "Under Review", href: "/contributor/under-review", icon: <ClockIcon className="w-5 h-5" />, count: counts.pending },
    { label: "Rejections", href: "/contributor/rejections", icon: <ExclamationCircleIcon className="w-5 h-5" />, count: counts.rejected },
    { label: "Published", href: "/contributor/published", icon: <CheckCircleIcon className="w-5 h-5" />, count: counts.approved }
  ];

  const supportItems = [
    { label: "Settings", href: "/contributor/settings", icon: <Cog6ToothIcon className="w-5 h-5" /> },
    { label: "Help", href: "/contributor/help", icon: <QuestionMarkCircleIcon className="w-5 h-5" /> }
  ];

  // Reusable JSX for the sidebar's content to avoid duplication
  const sidebarContent = (
    <Fragment>
      <div className="p-6 relative">
        {!isDesktop && (
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute right-3 top-3 p-2 rounded-full text-gray-300 hover:bg-gray-800/60 hover:text-white transition-all"
            aria-label="Close menu"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
        <div className="absolute -left-2 top-4 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl"></div>
        <div className="relative flex items-center">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
            <CameraIcon className="w-6 h-6 text-white" />
          </div>
          <div className="ml-3">
            <Link href="/" className="text-2xl font-bold text-white flex items-center gap-1 relative">
              KlickStock
            </Link>
            <div className="text-sm text-indigo-200 font-medium">Contributor Portal</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-2 flex-1 overflow-y-auto">
        <div className="mb-6">
          <h3 className="px-3 mb-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">General</h3>
          <nav className="space-y-1.5">{generalItems.map((item, i) => renderNavItem(item, pathname, i))}</nav>
        </div>
        <div className="mb-6">
          <h3 className="px-3 mb-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">Manage Content</h3>
          <nav className="space-y-1.5">{contentItems.map((item, i) => renderNavItemWithCount(item, pathname, isLoading, i))}</nav>
        </div>
        <div className="mb-6">
          <h3 className="px-3 mb-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">Support</h3>
          <nav className="space-y-1.5">{supportItems.map((item, i) => renderNavItem(item, pathname, i))}</nav>
        </div>
      </div>

      <div className="p-4 mt-auto">
        <div className="border-t border-gray-700/50 pt-4">
          <Link href="/api/auth/signout" className="flex items-center px-4 py-3 text-sm font-medium text-gray-300 rounded-xl hover:bg-gray-800/60 hover:text-red-300 transition-all">
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center mr-3">
              <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-300" />
            </div>
            Sign out
          </Link>
        </div>
      </div>
    </Fragment>
  );

  return (
    <>
      {/* Desktop Sidebar: Always in the DOM, hidden on small screens */}
      <div className="hidden lg:flex h-full w-72 bg-gray-900 bg-gradient-to-b from-gray-900 via-gray-900 to-[#161b2e] border-r border-gray-800/50 flex-col">
        {sidebarContent}
      </div>

      {/* Mobile-only elements: Rendered only on the client for non-desktop screens */}
      {!isDesktop && (
        <>
          {/* Mobile Toggle Button */}
          {!isMobileMenuOpen && (
            <button
              id="mobile-toggle"
              onClick={() => setIsMobileMenuOpen(true)}
              className="fixed top-4 left-4 z-50 p-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-blue-500/30 focus:outline-none transition-all duration-200 hover:scale-105 lg:hidden"
              aria-label="Open menu"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          )}

          {/* Dark Overlay */}
          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Mobile Sidebar Panel */}
          <div
            className={`
              fixed top-0 left-0 z-50 h-full w-80 transform transition-transform duration-300 ease-in-out
              bg-gray-900 bg-gradient-to-b from-gray-900 via-gray-900 to-[#161b2e] border-r border-gray-800/50 flex flex-col
              lg:hidden
              ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
          >
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
};

// Helper function to render a nav item
function renderNavItem(
  item: { label: string; href: string; icon: JSX.Element },
  pathname: string,
  index: number
) {
  const isActive = pathname === item.href;
  return (
    <Link
      key={`${item.href}-${index}`}
      href={item.href}
      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all ${isActive ? "bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-white" : "text-gray-300 hover:bg-gray-800/60 hover:text-white"}`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all ${isActive ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md" : "bg-gray-800/60 group-hover:bg-gray-700/50"}`}>
        {item.icon}
      </div>
      <span>{item.label}</span>
      {isActive && <div className="ml-auto h-2 w-2 rounded-full bg-blue-400"></div>}
    </Link>
  );
}

// Helper function to render a nav item with count
function renderNavItemWithCount(
  item: { label: string; href: string; icon: JSX.Element; count: number },
  pathname: string,
  isLoading: boolean,
  index: number
) {
  const isActive = pathname === item.href;
  return (
    <Link
      key={`${item.href}-${index}`}
      href={item.href}
      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all ${isActive ? "bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-white" : "text-gray-300 hover:bg-gray-800/60 hover:text-white"}`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all ${isActive ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md" : "bg-gray-800/60 group-hover:bg-gray-700/50"}`}>
        {item.icon}
      </div>
      <span>{item.label}</span>
      {isLoading ? (
        <div className="ml-auto w-6 h-6 bg-gray-700/50 rounded-full animate-pulse"></div>
      ) : (
        item.count > 0 && (
          <div className="ml-auto px-2 py-0.5 text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-inner">
            {item.count}
          </div>
        )
      )}
      {isActive && item.count === 0 && !isLoading && <div className="ml-auto h-2 w-2 rounded-full bg-blue-400"></div>}
    </Link>
  );
}