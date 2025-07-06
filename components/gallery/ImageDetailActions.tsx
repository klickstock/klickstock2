"use client";

import { useState, useEffect } from "react";
import { Download, Heart, Share, Eye, Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// --- Helper functions for API calls ---

// Calls the server to save/unsave an image
async function toggleSaveImage(id: string, isSaved: boolean) {
  const response = await fetch('/api/images/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageId: id, action: isSaved ? 'unsave' : 'save' }),
  });
  if (!response.ok) throw new Error('Failed to save image');
  return await response.json();
}

// Checks if the current user has saved the image
async function checkIfImageIsSaved(id: string) {
  try {
    const response = await fetch(`/api/images/save/check?imageId=${id}`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.isSaved;
  } catch (error) {
    console.error('Error checking save status:', error);
    return false;
  }
}

// Calls the server API route to record the download in the database
async function recordDownloadOnServer(imageId: string) {
  const response = await fetch('/api/images/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Could not track download.');
  }

  return await response.json();
}

// --- Component ---

interface ImageDetailActionsProps {
  imageId: string;
  imageUrl: string;
  title: string;
  currentDownloads: number;
  currentViews: number;
}

export function ImageDetailActions({
  imageId,
  imageUrl,
  title,
  currentDownloads,
  currentViews
}: ImageDetailActionsProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [downloads, setDownloads] = useState(currentDownloads);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = status === 'authenticated';

  const [showTimer, setShowTimer] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [downloadPrepared, setDownloadPrepared] = useState(false);
  const [downloadData, setDownloadData] = useState<{
    objectUrl?: string;
    fileName: string;
    directUrl?: string;
  }>({ fileName: '' });

  useEffect(() => {
    const checkSaveStatus = async () => {
      try {
        setIsLoading(true);
        if (isAuthenticated) {
          const savedStatus = await checkIfImageIsSaved(imageId);
          setIsSaved(savedStatus);
        }
      } catch (error) {
        console.error('Error checking save status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSaveStatus();
  }, [imageId, isAuthenticated]);

  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    if (showTimer && timeLeft > 0) {
      timerId = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (showTimer && timeLeft === 0 && downloadPrepared) {
      completeDownload();
    }
    return () => { if (timerId) clearTimeout(timerId); };
  }, [showTimer, timeLeft, downloadPrepared]);

  useEffect(() => {
    return () => {
      if (downloadData.objectUrl) URL.revokeObjectURL(downloadData.objectUrl);
    };
  }, [downloadData.objectUrl]);

  const startDownloadProcess = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to download images');
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      router.push('/login');
      return;
    }

    setIsDownloading(true);

    try {
      // Step 1: Tell the server to record the download.
      await recordDownloadOnServer(imageId);
    } catch (error) {
      console.error('Error recording download:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
      setIsDownloading(false);
      return; // Stop if we can't record the download
    }

    // Step 2: Prepare the file for client-side download.
    const fileExtension = imageUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
    const cleanFileName = `${title.replace(/[^\w\s-]/gi, '')}_klickstock.${fileExtension}`;

    setDownloadData({ directUrl: imageUrl, fileName: cleanFileName });

    // Step 3: Start the UI timer.
    setTimeLeft(10);
    setShowTimer(true);
    setDownloadPrepared(true);
    toast.success('Your download is being prepared...', { duration: 3000 });

    // Step 4: Attempt to fetch image as a blob for a direct, clean download.
    fetchImageAsBlob(imageUrl, cleanFileName).catch(error => {
      console.warn('Blob fetch failed, will use fallback download method. This is likely a CORS issue.', error);
    });
  };

  const fetchImageAsBlob = async (url: string, fileName: string) => {
    try {
      // Create a proxy request through your API to avoid CORS issues
      const response = await fetch('/api/images/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      setDownloadData(prev => ({ ...prev, objectUrl, fileName }));
    } catch (error) {
      // If proxy fails, try direct fetch
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        setDownloadData(prev => ({ ...prev, objectUrl, fileName }));
      } catch (directError) {
        console.warn('Both proxy and direct fetch failed:', directError);
        throw directError;
      }
    }
  };

  const completeDownload = () => {
    if (!downloadPrepared) return;

    try {
      const link = document.createElement('a');
      link.download = downloadData.fileName;
      link.style.display = 'none';

      if (downloadData.objectUrl) {
        // Preferred Method: Use the blob URL. This provides the best user experience.
        link.href = downloadData.objectUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started!');
      } else if (downloadData.directUrl) {
        // Enhanced fallback: Force download using data URL
        forceDownloadFallback(downloadData.directUrl, downloadData.fileName);
      } else {
        throw new Error('No download URL available.');
      }

      // Optimistically update the UI download counter.
      setDownloads(prev => prev + 1);

    } catch (error) {
      console.error('Download completion error:', error);
      toast.error('Could not initiate download. Please try again.');
    } finally {
      resetDownloadState();
    }
  };

  const forceDownloadFallback = async (imageUrl: string, fileName: string) => {
    try {
      // Try to create a canvas and force download
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = fileName;
              link.style.display = 'none';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              toast.success('Download started!');
            } else {
              fallbackToNewTab(imageUrl, fileName);
            }
          }, 'image/jpeg', 0.95);
        } else {
          fallbackToNewTab(imageUrl, fileName);
        }
      };

      img.onerror = () => {
        fallbackToNewTab(imageUrl, fileName);
      };

      img.src = imageUrl;
    } catch (error) {
      console.error('Canvas download failed:', error);
      fallbackToNewTab(imageUrl, fileName);
    }
  };

  const fallbackToNewTab = (imageUrl: string, fileName: string) => {
    // Last resort: open in new tab with instructions
    const link = document.createElement('a');
    link.href = imageUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Image opened in a new tab. Right-click and "Save Image As..." to download.', {
      duration: 6000,
      icon: '💡'
    });
  };

  const resetDownloadState = () => {
    setIsDownloading(false);
    setShowTimer(false);
    setTimeLeft(10);
    setDownloadPrepared(false);
    if (downloadData.objectUrl) URL.revokeObjectURL(downloadData.objectUrl);
    setDownloadData({ fileName: '' });
  };

  const handleSaveToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to save images');
      router.push('/login');
      return;
    }
    const originalSaveState = isSaved;
    setIsSaved(!originalSaveState); // Optimistic update
    try {
      await toggleSaveImage(imageId, originalSaveState);
      toast.success(originalSaveState ? 'Removed from saved items' : 'Added to saved items');
    } catch (error) {
      setIsSaved(originalSaveState); // Revert on error
      toast.error('An error occurred. Please try again.');
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: `Check out this image on Klickstock: ${title}`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        toast.error('Failed to share image.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div>
      <div className="bg-gray-800/50 rounded-xl p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center text-gray-300">
          <Eye className="w-4 h-4 mr-2 text-blue-400" />
          <span>{new Intl.NumberFormat().format(currentViews)} views</span>
        </div>
        <div className="flex items-center text-gray-300">
          <Download className="w-4 h-4 mr-2 text-green-400" />
          <span>{new Intl.NumberFormat().format(downloads)} downloads</span>
        </div>
      </div>

      <div className="space-y-4">
        {showTimer ? (
          <div className="relative">
            <div className="w-full rounded-full h-16 overflow-hidden bg-gray-800 border border-gray-700/50 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-1000 ease-linear"
                style={{ width: `${(10 - timeLeft) / 10 * 100}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <Clock className="w-5 h-5 mr-2 text-indigo-300 animate-pulse" />
                <span className="font-medium">
                  {timeLeft === 0
                    ? 'Initiating download...'
                    : `Download ready in ${timeLeft} second${timeLeft !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={startDownloadProcess}
            disabled={isDownloading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-4 px-6 rounded-full flex items-center justify-center transition-all duration-300 hover:shadow-[0_5px_15px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                <span>Preparing...</span>
              </>
            ) : (
              <>
                <Download className="w-6 h-6 mr-2" />
                Download
              </>
            )}
          </button>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleSaveToggle}
            disabled={isLoading || !isAuthenticated}
            className={`
              bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium py-3 px-4 rounded-full 
              flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isSaved ? 'bg-gradient-to-r from-pink-600/30 to-red-600/30 hover:from-pink-600/20 hover:to-red-600/20' : ''}
            `}
          >
            <Heart className={`w-5 h-5 mr-2 transition-colors ${isSaved ? 'text-red-500 fill-current' : 'text-gray-200'}`} />
            {isSaved ? 'Saved' : 'Save'}
          </button>

          <button
            onClick={handleShare}
            disabled={isSharing}
            className="bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium py-3 px-4 rounded-full flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isSharing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gray-200 mr-2"></div>
                Sharing...
              </>
            ) : (
              <>
                <Share className="w-5 h-5 mr-2" />
                Share
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}