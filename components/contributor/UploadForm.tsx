"use client";

import axios from "axios"; // Import axios for upload with progress
import { useState, useCallback, useEffect, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  X, Upload, Check, CheckSquare, Square, Loader2, AlertCircle
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import {
  getInitialUploadsWithSignedUrls,
  deleteInitialUpload,
  createContributorItemsFromUploads,
  deleteAllInitialUploads, getPresignedUrls,
  finalizeUpload,
} from "@/actions/contributor";
import { getBase64FromUrl } from "@/actions/getBase64FromUrl";

import { RootState } from "@/redux/store";
import toast from "react-hot-toast"; // <--- 1. Replaced 'sonner' with 'react-hot-toast'
import {
  setFiles,
  updateFile,
  removeFileById,
  clearFiles,
  setUploading,
  setError,
  setSuccess, addFilesToQueue,
  updateFileUploadState,
} from "@/redux/features/uploadSlice";
import {
  categoryOptions,
} from "@/lib/constants";
import { UploadSidebar } from "./UploadSidebar";
import { UploadFile } from "@/redux/features/uploadSlice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


// Maximum single file size (45MB)
const MAX_SINGLE_FILE_SIZE = 45 * 1024 * 1024;
// Maximum total size for a single batch upload (260MB)
const MAX_TOTAL_FILE_SIZE = 260 * 1024 * 1024;

const CATEGORY_OPTIONS = categoryOptions;

// Helper to check for image transparency using a signed URL
const hasTransparency = (imageUrl: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(false);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          resolve(true);
          return;
        }
      }
      resolve(false);
    };
    img.onerror = () => resolve(false);
    img.src = imageUrl;
  });
};

export function UploadForm() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { files, isUploading, error, success } = useSelector((state: RootState) => state.upload);

  const [initialLoading, setInitialLoading] = useState(true);
  const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const [newTag, setNewTag] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [transparentImages, setTransparentImages] = useState<{ [key: string]: boolean | null }>({});


  // Use deferred value for smooth rendering of images
  const deferredFiles = useDeferredValue(files);

  const loadInitialFiles = useCallback(async () => {
    try {
      const initialFiles = await getInitialUploadsWithSignedUrls();

      const filesWithRestoredProgress = initialFiles.map(file => {
        const savedProgressRaw = localStorage.getItem(`upload-progress-${file.id}`);
        if (savedProgressRaw) {
          try {
            const savedProgress = JSON.parse(savedProgressRaw);
            return { ...file, ...savedProgress };
          } catch (e) {
            console.error("Failed to parse saved progress for file", file.id, e);
            return file;
          }
        }
        return file;
      });

      dispatch(setFiles(filesWithRestoredProgress));
      if (filesWithRestoredProgress.length > 0) {
        setActiveFileIndex(0);
        setSelectedFiles([0]);
      } else {
        setActiveFileIndex(null);
        setSelectedFiles([]);
      }
    } catch (err: any) {
      toast.error("Failed to load your pending uploads.");
      dispatch(setError(err.message));
    } finally {
      setInitialLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadInitialFiles();
    return () => {
      dispatch(clearFiles());
    };
  }, [loadInitialFiles, dispatch]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const totalSize = acceptedFiles.reduce((acc, file) => acc + file.size, 0);
    if (totalSize > MAX_TOTAL_FILE_SIZE) {
      toast.error(`Total file size exceeds the limit. Please upload less than ${MAX_TOTAL_FILE_SIZE / 1024 / 1024}MB at a time.`);
      return;
    }

    const filesToUpload = acceptedFiles.map(file => ({
      file,
      tempId: `${file.name}-${file.size}-${Date.now()}`
    }));

    const filesForQueue: UploadFile[] = filesToUpload.map(({ file, tempId }) => ({
      id: tempId,
      tempId,
      status: 'uploading',
      progress: 0,
      previewUrl: URL.createObjectURL(file),
      originalFileName: file.name,
      title: file.name.split('.').slice(0, -1).join('.').replace(/[-_]/g, ' '),
      description: '', tags: [], license: 'STANDARD', category: '',
      imageType: file.type.includes('png') ? 'PNG' : 'JPG',
      aiGeneratedStatus: 'NOT_AI_GENERATED'
    }));
    dispatch(addFilesToQueue(filesForQueue));

    try {
      const presignedUrlRequests = filesToUpload.map(({ file }) => ({
        fileName: file.name,
        fileType: file.type,
      }));
      const presignedUrlResponses = await getPresignedUrls(presignedUrlRequests);

      const uploadPromises = filesToUpload.map(async ({ file, tempId }, index) => {
        const { url: presignedUrl, key: s3Key } = presignedUrlResponses[index];

        await axios.put(presignedUrl, file, {
          headers: { 'Content-Type': file.type },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            dispatch(updateFileUploadState({ tempId, data: { progress } }));
          },
        });

        dispatch(updateFileUploadState({ tempId, data: { progress: 100, status: 'processing' } }));

        const finalizationData = {
          s3Key,
          originalFileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        };
        const newRecord = await finalizeUpload(finalizationData);

        const finalPreviewUrl = await getInitialUploadsWithSignedUrls().then(uploads =>
          uploads.find(u => u.id === newRecord.id)?.previewUrl || ''
        );

        dispatch(updateFileUploadState({
          tempId,
          data: {
            id: newRecord.id,
            status: 'complete',
            previewUrl: finalPreviewUrl,
          }
        }));
      });

      await Promise.all(uploadPromises);
      toast.success("All files uploaded successfully!");

    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
      dispatch(setError(err.message));
    } finally {
      dispatch(setUploading(false));
    }
  }, [dispatch]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif'] },
    maxSize: MAX_SINGLE_FILE_SIZE,
    disabled: isUploading || initialLoading,
    onDropRejected: (fileRejections) => {
      fileRejections.forEach(rejection => {
        rejection.errors.forEach(err => {
          if (err.code === 'file-too-large') {
            toast.error(`File is too large. Maximum size is ${MAX_SINGLE_FILE_SIZE / 1024 / 1024}MB.`);
          } else {
            toast.error(err.message);
          }
        });
      });
    }
  });


  const handleRemoveFile = async (index: number) => {
    const fileToRemove = files[index];
    if (!fileToRemove) return;

    const originalFileCount = files.length;
    // --- 2. Updated toast logic for react-hot-toast ---
    const toastId = toast.loading(`Deleting ${fileToRemove.originalFileName}...`);

    localStorage.removeItem(`upload-progress-${fileToRemove.id}`);

    dispatch(removeFileById(fileToRemove.id));
    setSelectedFiles(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
    if (activeFileIndex === index) {
      setActiveFileIndex(originalFileCount > 1 ? 0 : null);
    } else if (activeFileIndex !== null && activeFileIndex > index) {
      setActiveFileIndex(activeFileIndex - 1);
    }

    try {
      await deleteInitialUpload(fileToRemove.id);
      toast.success("File deleted successfully.", { id: toastId });
    } catch (err: any) {
      toast.error(`Failed to delete file: ${err.message}`, { id: toastId });
      await loadInitialFiles();
    }
  };

  const confirmDeleteAll = async () => {
    if (files.length === 0) return;
    const toastId = toast.loading(`Deleting all ${files.length} files...`);
    const fileIds = files.map(f => f.id);

    fileIds.forEach(id => localStorage.removeItem(`upload-progress-${id}`));

    try {
      const result = await deleteAllInitialUploads(fileIds);
      toast.success(`${result.count} files deleted successfully.`, { id: toastId });
      dispatch(clearFiles());
      setActiveFileIndex(null);
      setSelectedFiles([]);
    } catch (err: any) {
      toast.error(`Failed to delete all files: ${err.message}`, { id: toastId });
      await loadInitialFiles();
    } finally {
      setShowDeleteAllDialog(false);
    }
  };

  const isFileComplete = (file: UploadFile) => {
    return Boolean(
      file.title?.trim() &&
      file.category?.trim() &&
      file.imageType &&
      file.aiGeneratedStatus &&
      file.description?.trim() &&
      file.tags.length > 0
    );
  };

  // =================================================================
  // ==  HERE IS YOUR FUNCTION, AS YOU PROVIDED IT.
  // =================================================================
  const handleSaveProgress = () => {
    if (selectedFiles.length === 0) {
      toast.error("No files selected to save.");
      return;
    }

    let savedCount = 0;
    selectedFiles.forEach(index => {
      const file = files[index];
      if (file && file.id && file.status === 'complete') {
        const metadata = {
          title: file.title,
          description: file.description,
          tags: file.tags,
          category: file.category,
          license: file.license,
          imageType: file.imageType,
          aiGeneratedStatus: file.aiGeneratedStatus,
        };
        localStorage.setItem(`upload-progress-${file.id}`, JSON.stringify(metadata));
        savedCount++;
      }
    });

    if (savedCount > 0) {
      // THIS IS THE TOAST YOU WANTED TO SHOW. IT WILL FIRE CORRECTLY.
      toast.success(`Progress for ${savedCount} image(s) saved locally.`);
    }
  };

  const handleSubmitAll = async () => {
    if (files.length === 0) {
      toast.error("There are no files to submit.");
      return;
    }

    const filesToSubmit = files
      .filter(file => isFileComplete(file))
      .map(({ previewUrl, originalFileName, ...rest }) => rest);

    if (filesToSubmit.length === 0) {
      toast.error("Complete required fields for at least one image to submit.");
      return;
    }

    dispatch(setUploading(true));
    const toastId = toast.loading("Submitting files for review...");

    try {
      const result = await createContributorItemsFromUploads(filesToSubmit, false);

      if (result.count > 0) {
        toast.success(`${result.count} file(s) were successfully submitted.`, { id: toastId });

        filesToSubmit.forEach(file => {
          localStorage.removeItem(`upload-progress-${file.id}`);
        });

        const allFilesWereSubmitted = filesToSubmit.length === files.length;
        if (allFilesWereSubmitted) {
          dispatch(setSuccess("Submission complete!"));
          setTimeout(() => {
            router.push('/contributor/under-review');
            dispatch(clearFiles());
          }, 1500);
        } else {
          await loadInitialFiles();
        }
      } else {
        toast.error("No files were submitted. They may have been processed already.", { id: toastId });
        await loadInitialFiles();
      }
    } catch (err: any) {
      toast.error(`Submission failed: ${err.message}`, { id: toastId });
      dispatch(setError(err.message));
    } finally {
      dispatch(setUploading(false));
    }
  };


  useEffect(() => {
    files.forEach(async (file) => {
      if (file.imageType === 'PNG' && file.previewUrl && transparentImages[file.id] === undefined) {
        setTransparentImages(prev => ({ ...prev, [file.id]: null }));
        const isTransparent = await hasTransparency(file.previewUrl);
        setTransparentImages(prev => ({
          ...prev,
          [file.id]: isTransparent
        }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const handleAddTag = (index: number) => {
    if (!newTag.trim()) return;
    const file = files[index];
    if (file.tags.length >= 50) return toast.error("Maximum 50 keywords allowed.");

    const newTags = newTag.split(',').map(tag => tag.trim()).filter(Boolean);
    if (file.tags.length + newTags.length > 50) return toast.error("Cannot exceed 50 keywords.");

    dispatch(updateFile({ index, data: { tags: [...new Set([...file.tags, ...newTags])] } }));
    setNewTag("");
  };

  const handleRemoveTag = (fileIndex: number, tagIndex: number) => {
    const newTags = [...files[fileIndex].tags];
    newTags.splice(tagIndex, 1);
    dispatch(updateFile({ index: fileIndex, data: { tags: newTags } }));
  };


  const generateContentWithAI = async () => {
    if (activeFileIndex === null) return;

    const apiKey = localStorage.getItem("geminiApiKey");
    if (!apiKey) {
      toast.error(
        // react-hot-toast supports JSX just like sonner
        () => (
          <div className="flex flex-col gap-2">
            <span>Gemini API key is missing.</span>
            <a href="/contributor/settings" className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 text-center">Go to Settings</a>
          </div>
        )
      );
      return;
    }

    setIsGenerating(true);
    dispatch(setError(null));
    const toastId = toast.loading("Generating content with AI...");

    try {
      const file = files[activeFileIndex];

      const imageResult = await getBase64FromUrl(file.previewUrl);
      if (!imageResult.success || !imageResult.base64) {
        throw new Error(imageResult.error || "Failed to process image for AI analysis.");
      }
      const imageBase64 = imageResult.base64;

      const availableCategories = CATEGORY_OPTIONS.map(cat => cat.value).join(", ");

      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `Generate a professional title, detailed description, 20-40 relevant keywords, and select the most appropriate category for this image. The category MUST be chosen from this exact list: ${availableCategories}. Format your response as a single, clean JSON object with fields: "title", "description", "keywords" (as an array of strings), and "category" (must match one from the list exactly). Do not include any special characters or markdown formatting like \`\`\`json.` },
              {
                inline_data: {
                  mime_type: file.imageType.startsWith('PNG') ? 'image/png' : 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }],
          generationConfig: { temperature: 0.4, topK: 32, topP: 0.95, maxOutputTokens: 800 }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: "Could not parse API error response." } }));
        throw new Error(errorData.error?.message || `API error: ${response.statusText}`);
      }
      const data = await response.json();

      if (data.error) throw new Error(data.error.message || "Error generating content");

      const textResponse = data.candidates[0].content.parts[0].text;
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid JSON response format from AI.");

      const generatedContent = JSON.parse(jsonMatch[0]);
      if (!CATEGORY_OPTIONS.some(cat => cat.value === generatedContent.category)) {
        generatedContent.category = '';
        // --- 3. Replaced toast.warning with a standard toast call ---
        toast("AI suggested a category that doesn't exist. Please select one manually.", {
          icon: '⚠️'
        });
      }

      dispatch(updateFile({
        index: activeFileIndex,
        data: {
          title: generatedContent.title || file.title,
          description: generatedContent.description || file.description,
          tags: generatedContent.keywords || file.tags,
          category: generatedContent.category || file.category
        }
      }));

      toast.success("Content generated successfully!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(`AI generation failed: ${err.message}`, { id: toastId });
      dispatch(setError(err.message || "Failed to generate content."));
    } finally {
      setIsGenerating(false);
    }
  };


  const generateContentWithAIForAll = async () => {
    if (selectedFiles.length === 0) {
      toast.error("No images selected for AI generation.");
      return;
    }

    const apiKey = localStorage.getItem("geminiApiKey");
    if (!apiKey) {
      toast.error(
        () => (
          <div className="flex flex-col gap-2">
            <span>Gemini API key is missing.</span>
            <a href="/contributor/settings" className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 text-center">Go to Settings</a>
          </div>
        )
      );
      return;
    }

    setIsGeneratingBulk(true);
    dispatch(setError(null));

    const availableCategories = CATEGORY_OPTIONS.map(cat => cat.value).join(", ");
    let processedCount = 0;
    let failedCount = 0;

    for (const index of selectedFiles) {
      const file = files[index];
      const toastId = `ai-gen-${file.id}`; // Use a consistent ID for each file's toast
      toast.loading(`Processing image ${processedCount + 1}/${selectedFiles.length}...`, { id: toastId });

      try {
        const imageResult = await getBase64FromUrl(file.previewUrl);
        if (!imageResult.success || !imageResult.base64) {
          throw new Error(imageResult.error || "Failed to process image.");
        }
        const imageBase64 = imageResult.base64;

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: `Generate a professional title, detailed description, 5-7 relevant keywords, and select the most appropriate category for this image. The category MUST be chosen from this exact list: ${availableCategories}. Format your response as a single, clean JSON object with fields: "title", "description", "keywords" (as an array of strings), and "category" (must match one from the list exactly). Do not include any special characters or markdown formatting like \`\`\`json.` },
                {
                  inline_data: {
                    mime_type: file.imageType.startsWith('PNG') ? 'image/png' : 'image/jpeg',
                    data: imageBase64
                  }
                }
              ]
            }],
            generationConfig: { temperature: 0.4, topK: 32, topP: 0.95, maxOutputTokens: 800 }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: { message: "Could not parse API error response." } }));
          throw new Error(errorData.error?.message || `API error: ${response.statusText}`);
        }
        const data = await response.json();

        if (data.error) throw new Error(data.error.message || "Error generating content");
        const textResponse = data.candidates[0].content.parts[0].text;
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid JSON response format from AI.");

        const generatedContent = JSON.parse(jsonMatch[0]);
        if (!CATEGORY_OPTIONS.some(cat => cat.value === generatedContent.category)) {
          generatedContent.category = '';
        }

        dispatch(updateFile({
          index,
          data: {
            title: generatedContent.title || file.title,
            description: generatedContent.description || file.description,
            tags: generatedContent.keywords || file.tags,
            category: generatedContent.category || file.category
          }
        }));

        processedCount++;
        toast.success(`Generated content for image ${processedCount}`, { id: toastId });
      } catch (err: any) {
        console.error(`Failed to generate content for image at index ${index}:`, err);
        failedCount++;
        toast.error(`Failed for image ${processedCount + failedCount}`, { id: toastId });
      }

      if (selectedFiles.length > 1 && (processedCount + failedCount) < selectedFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (processedCount > 0) toast.success(`Successfully generated content for ${processedCount} image(s).`);
    if (failedCount > 0) toast.error(`Failed to generate content for ${failedCount} image(s).`);

    setIsGeneratingBulk(false);
  };

  const handleActivateFile = (index: number) => {
    setActiveFileIndex(index);
    setSelectedFiles(prev => (prev.includes(index) ? prev : [...prev, index]));
  };

  const toggleFileSelection = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    const isCurrentlySelected = selectedFiles.includes(index);
    if (isCurrentlySelected && activeFileIndex === index) {
      setActiveFileIndex(null);
    }
    setSelectedFiles(prev =>
      isCurrentlySelected
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const selectAll = () => setSelectedFiles(files.map((_, index) => index));
  const clearSelection = () => {
    setSelectedFiles([]);
    setActiveFileIndex(null);
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-12 w-12 text-indigo-400 animate-spin" />
        <p className="ml-4 text-gray-300">Loading your uploads...</p>
      </div>
    );
  }

  const renderGrid = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-12 custom-scrollbar scroll-smooth">
      {deferredFiles.map((file, index) => {
        const isComplete = isFileComplete(file);
        const isSelectedForEditing = index === activeFileIndex;
        const isSelectedForBulk = selectedFiles.includes(index);

        return (
          <div
            key={file.id || file.tempId}
            className={`relative group overflow-hidden rounded-lg shadow-md transition-all ${file.status === 'complete' ? 'cursor-pointer' : 'cursor-default'} ${isSelectedForEditing ? 'border-2 border-indigo-500 ring-2 ring-indigo-500/30' : isSelectedForBulk ? 'border-2 border-indigo-400 ring-1 ring-indigo-400/20' : 'border border-gray-700 hover:border-gray-600'}`}
            onClick={() => file.status === 'complete' && handleActivateFile(index)}
            style={{ aspectRatio: '1/1', backgroundColor: '#1f2937' }}>

            {file.status !== 'complete' && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/70 text-white p-2">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm font-medium mt-2 text-center">
                  {file.status === 'uploading' ? `Uploading...` : 'Processing...'}
                </p>
                {file.status === 'uploading' && (
                  <div className="w-full bg-gray-600 rounded-full h-1.5 mt-3">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${file.progress || 0}%` }}></div>
                  </div>
                )}
              </div>
            )}

            {file.status === 'complete' && (
              <>
                <div className="absolute top-2 left-2 z-30" title={isComplete ? "Complete" : "Incomplete"}>
                  {isComplete ? <div className="w-7 h-7 flex items-center justify-center bg-green-500/80 text-white rounded-full"><Check className="h-4 w-4" /></div> : <div className="w-7 h-7 flex items-center justify-center bg-red-500/70 text-white rounded-full"><X className="h-4 w-4" /></div>}
                </div>
                <div className="absolute top-2 right-2 z-20">
                  <button type="button" onClick={(e) => toggleFileSelection(index, e)} className="w-7 h-7 flex items-center justify-center bg-black/40 hover:bg-black/60 rounded-md transition-colors">
                    {isSelectedForBulk ? <CheckSquare className="h-5 w-5 text-indigo-400" /> : <Square className="h-5 w-5 text-gray-300 group-hover:text-white" />}
                  </button>
                </div>
              </>
            )}

            <div className="absolute inset-0 flex items-center justify-center">
              {file.imageType === 'PNG' && transparentImages[file.id] && (
                <div className="absolute inset-0 bg-[length:16px_16px] bg-[linear-gradient(45deg,#1f2937_25%,transparent_25%,transparent_75%,#1f2937_75%,#1f2937),linear-gradient(45deg,#1f2937_25%,transparent_25%,transparent_75%,#1f2937_75%,#1f2937)]" style={{ backgroundPosition: "0 0, 8px 8px", backgroundSize: "16px 16px", zIndex: 0 }} />
              )}
              <img src={file.previewUrl} alt={file.title || ''} className={`w-full h-full transition-transform duration-200 group-hover:scale-105 ${file.imageType === 'PNG' && transparentImages[file.id] ? 'object-contain bg-transparent' : 'object-cover'}`} style={{ position: 'relative', zIndex: 1 }} onLoad={() => { if (file.previewUrl.startsWith('blob:')) URL.revokeObjectURL(file.previewUrl) }} />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="relative flex flex-col h-full">
      <div className="w-full mx-auto px-6 py-6 h-full relative">
        {success ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold text-gray-200 mb-2">Submission Complete!</h3>
            <p className="text-gray-400 mb-6">Your files are now being reviewed.</p>
            <Button onClick={() => router.push('/contributor')} variant="outline" className="bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700 hover:text-white">
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <>
            {files.length === 0 && !isUploading ? (
              <div className="flex items-center justify-center h-full">
                <div {...getRootProps()} className="border border-dashed border-gray-600 rounded-lg w-full max-w-4xl h-2/3 min-h-[400px] cursor-pointer">
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-20 h-20 bg-indigo-800/70 rounded-full flex items-center justify-center mb-6">
                      <Upload className="h-10 w-10 text-indigo-300" />
                    </div>
                    <h2 className="text-2xl font-medium text-white mb-2">Drag & drop your images here</h2>
                    <p className="text-gray-400 mb-8">Or click to browse files</p>
                    <button type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white transition-colors px-8 py-3 rounded-lg font-medium text-lg">Select Files</button>
                    <p className="text-gray-500 text-sm mt-8">Maximum file size: {MAX_SINGLE_FILE_SIZE / 1024 / 1024}MB</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full">
                <div className="pr-[400px] h-full">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <h3 className="text-xl font-medium text-white">{files.length} image{files.length !== 1 ? 's' : ''} ready</h3>
                      {isUploading && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded-lg">
                          <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                          <span className="text-sm text-indigo-300 font-medium">Uploading...</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={selectedFiles.length === files.length ? clearSelection : selectAll} disabled={isUploading} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md text-sm font-medium transition-colors disabled:opacity-50">
                        {selectedFiles.length === files.length ? "Deselect All" : "Select All"}
                      </button>
                      <button type="button" onClick={() => setShowDeleteAllDialog(true)} disabled={isUploading || files.length === 0} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50">
                        Clear All
                      </button>
                      <div {...getRootProps()} className={`flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md text-sm font-medium transition-colors ${isUploading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                        <input {...getInputProps()} />
                        <Upload className="h-4 w-4" />
                        <span>Add more</span>
                      </div>
                    </div>
                  </div>

                  {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

                  {renderGrid()}

                </div>
              </div>
            )}

            {files.length > 0 && activeFileIndex !== null && (
              <UploadSidebar
                files={files}
                activeFileIndex={activeFileIndex}
                setActiveFileIndex={setActiveFileIndex}
                newTag={newTag}
                setNewTag={setNewTag}
                handleAddTag={handleAddTag}
                handleRemoveTag={handleRemoveTag}
                handleRemoveFile={handleRemoveFile}
                selectedFiles={selectedFiles}
                isGenerating={isGenerating}
                isGeneratingBulk={isGeneratingBulk}
                generateContentWithAI={generateContentWithAI}
                generateContentWithAIForAll={generateContentWithAIForAll}
                isUploading={isUploading || initialLoading}
                transparentImages={transparentImages}
                handleSubmitAll={handleSubmitAll}
                handleSaveProgress={handleSaveProgress}
                isFileComplete={isFileComplete}
              />
            )}

            <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
              <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    This action will delete all {files.length} uploaded images. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDeleteAll} className="bg-red-600 hover:bg-red-700">
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}