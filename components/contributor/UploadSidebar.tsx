"use client";

import { useDispatch } from "react-redux";
import {
  X, Plus, Sparkles, ChevronLeft, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { updateFile } from "@/redux/features/uploadSlice";
import { UploadFile } from "@/redux/features/uploadSlice"; // Import the type for clarity
import {
  categoryOptions,
  licenseOptions,
  imageTypeOptions
} from "@/lib/constants";

// Constants
const LICENSE_OPTIONS = licenseOptions;
const IMAGE_TYPE_OPTIONS = imageTypeOptions;
const CATEGORY_OPTIONS = categoryOptions;

type UploadSidebarProps = {
  files: UploadFile[]; // Use the specific type
  activeFileIndex: number | null;
  setActiveFileIndex: (index: number | null) => void;
  newTag: string;
  setNewTag: (tag: string) => void;
  handleAddTag: (index: number) => void;
  handleRemoveTag: (fileIndex: number, tagIndex: number) => void;
  handleRemoveFile: (index: number) => void; // This now triggers the server deletion
  selectedFiles: number[];
  isGenerating: boolean;
  isGeneratingBulk: boolean;
  generateContentWithAI: () => void;
  generateContentWithAIForAll?: () => void; // Made optional as it's not in the previous code
  isUploading: boolean;
  transparentImages: { [key: string]: boolean }; // Key is now the file ID string
  handleSubmitAll: (saveDraft: boolean) => void;
  isFileComplete: (file: UploadFile) => boolean;
};

export function UploadSidebar({
  files,
  activeFileIndex,
  setActiveFileIndex,
  newTag,
  setNewTag,
  handleAddTag,
  handleRemoveTag,
  handleRemoveFile,
  selectedFiles,
  isGenerating,
  isGeneratingBulk,
  generateContentWithAI,
  generateContentWithAIForAll,
  isUploading,
  transparentImages,
  handleSubmitAll,
  isFileComplete
}: UploadSidebarProps) {
  const dispatch = useDispatch();

  if (activeFileIndex === null || !files[activeFileIndex]) {
    return null;
  }

  const activeFile = files[activeFileIndex];

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[400px] bg-gray-950 border-l border-gray-800/50 overflow-hidden z-50 flex flex-col h-screen shadow-xl max-h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          {/* This button should probably just close the sidebar view, not nullify the index */}
          <h3 className="text-lg font-medium text-white">
            {selectedFiles.length > 1
              ? `Edit ${selectedFiles.length} Images`
              : 'Edit Image Details'}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm('Are you sure you want to permanently delete this image?')) {
              // This correctly calls the parent handler which triggers server-side deletion
              handleRemoveFile(activeFileIndex);
            }
          }}
          className="h-10 w-10 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 rounded-lg flex items-center justify-center transition-all duration-200"
          aria-label="Delete image"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Image preview and AI button section */}
        <div className="p-4 bg-gray-900/30 border-b border-gray-800/50">
          <div
            className="relative h-48 rounded-lg overflow-hidden bg-gray-900 group border border-gray-700/50"
          >
            {/* FIX: Use file ID for transparentImages key */}
            {activeFile.imageType === 'PNG' && transparentImages[activeFile.id] && (
              <div
                className="absolute inset-0 bg-[length:16px_16px] bg-[linear-gradient(45deg,#1f2937_25%,transparent_25%,transparent_75%,#1f2937_75%,#1f2937),linear-gradient(45deg,#1f2937_25%,transparent_25%,transparent_75%,#1f2937_75%,#1f2937)]"
                style={{
                  backgroundPosition: "0 0, 8px 8px",
                  backgroundSize: "16px 16px",
                  zIndex: 0
                }}
              />
            )}
            {/* FIX: Use `previewUrl` instead of `preview` */}
            <img
              src={activeFile.previewUrl}
              alt={activeFile.title || `Image ${activeFileIndex + 1}`}
              className={`w-full h-full pointer-events-none ${activeFile.imageType === 'PNG' && transparentImages[activeFile.id] ? 'object-contain' : 'object-cover'}`}
              style={{ position: 'relative', zIndex: 1 }}
              draggable="false"
            />
          </div>

          {selectedFiles.length > 1 && generateContentWithAIForAll ? (
            <Button
              type="button"
              onClick={generateContentWithAIForAll}
              disabled={isGeneratingBulk || isGenerating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 py-5 mt-4"
            >
              <Sparkles className="h-5 w-5" />
              <span>
                {isGeneratingBulk
                  ? `Generating for ${selectedFiles.length} images...`
                  : `Generate AI for all ${selectedFiles.length} images`}
              </span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={generateContentWithAI}
              disabled={isGenerating || isGeneratingBulk}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 py-5 mt-4"
            >
              <Sparkles className="h-5 w-5" />
              <span>{isGenerating ? "Generating..." : "Generate with AI"}</span>
            </Button>
          )}
        </div>

        {/* Form fields - make this scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <div>
            <Label htmlFor="sidebar-title" className="text-gray-300 flex items-center">
              Title <span className="text-red-400 ml-1">*</span>
            </Label>
            <Input
              id="sidebar-title"
              value={activeFile.title}
              onChange={(e) => {
                dispatch(updateFile({
                  index: activeFileIndex,
                  data: { title: e.target.value }
                }));
              }}
              placeholder="Enter image title"
              required
              className="mt-1 bg-gray-800 border-gray-700 text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <Label htmlFor="sidebar-description" className="text-gray-300">
              Description
            </Label>
            <Textarea
              id="sidebar-description"
              value={activeFile.description}
              onChange={(e) => {
                dispatch(updateFile({
                  index: activeFileIndex,
                  data: { description: e.target.value }
                }));
              }}
              placeholder="Describe your image"
              rows={2}
              className="mt-1 bg-gray-800 border-gray-700 text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sidebar-category" className="text-gray-300 flex items-center">
                Category <span className="text-red-400 ml-1">*</span>
              </Label>
              <Select
                value={activeFile.category}
                onValueChange={(value) => {
                  dispatch(updateFile({
                    index: activeFileIndex,
                    data: { category: value }
                  }));
                }}
              >
                <SelectTrigger id="sidebar-category" className="mt-1 bg-gray-800 border-gray-700 text-gray-200">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border border-gray-700 text-gray-200">
                  {CATEGORY_OPTIONS.map((category) => (
                    <SelectItem key={category.value} value={category.value} className="text-gray-200 hover:bg-gray-700 focus:bg-gray-700">
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sidebar-license" className="text-gray-300 flex items-center">
                License
              </Label>
              <Select
                value={activeFile.license}
                onValueChange={(value) => {
                  dispatch(updateFile({
                    index: activeFileIndex,
                    data: { license: value }
                  }));
                }}
              >
                <SelectTrigger id="sidebar-license" className="mt-1 bg-gray-800 border-gray-700 text-gray-200">
                  <SelectValue placeholder="Select license" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border border-gray-700 text-gray-200">
                  {LICENSE_OPTIONS.map((license) => (
                    <SelectItem key={license.value} value={license.value} className="text-gray-200 hover:bg-gray-700 focus:bg-gray-700">
                      {license.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <Label htmlFor="sidebar-image-type" className="text-gray-300 flex items-center">
                Image Type <span className="text-red-400 ml-1">*</span>
              </Label>
              <Select
                value={activeFile.imageType}
                onValueChange={(value) => {
                  dispatch(updateFile({
                    index: activeFileIndex,
                    data: { imageType: value }
                  }));
                }}
              >
                <SelectTrigger id="sidebar-image-type" className="mt-1 bg-gray-800 border-gray-700 text-gray-200">
                  <SelectValue placeholder="Select image type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border border-gray-700 text-gray-200">
                  {IMAGE_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-gray-200 hover:bg-gray-700 focus:bg-gray-700">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sidebar-ai-status" className="text-gray-300 flex items-center mb-2">
                AI Generated <span className="text-red-400 ml-1">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="sidebar-ai-status"
                  checked={activeFile.aiGeneratedStatus === 'AI_GENERATED'}
                  onCheckedChange={(checked: boolean) => {
                    const newStatus = checked ? 'AI_GENERATED' : 'NOT_AI_GENERATED';
                    dispatch(updateFile({
                      index: activeFileIndex,
                      data: { aiGeneratedStatus: newStatus }
                    }));
                  }}
                />
                <span className="text-sm text-gray-400">
                  {activeFile.aiGeneratedStatus === 'AI_GENERATED' ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-gray-300 flex justify-between items-center">
              <span>Keywords <span className="text-red-400 ml-1">*</span></span>
              <span className="text-xs text-gray-500">{activeFile.tags.length}/50 max</span>
            </Label>
            <div className="flex flex-wrap gap-2 mt-2 min-h-[40px] p-2 border rounded-md border-gray-700 bg-gray-900">
              {activeFile.tags.map((tag: string, tagIndex: number) => (
                <Badge key={tagIndex} className="gap-1 bg-indigo-900/60 text-indigo-300 hover:bg-indigo-800/60 border border-indigo-800">
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(activeFileIndex, tagIndex)} className="ml-1 text-indigo-300 hover:text-indigo-100">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex mt-2 gap-3">
              <Input
                placeholder="Add keywords (comma separated)"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(activeFileIndex);
                  }
                }}
                className="bg-gray-800 border-gray-700 text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 h-10"
              />
              <Button type="button" onClick={() => handleAddTag(activeFileIndex)} className="bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700 hover:text-white h-10 px-4 flex items-center justify-center">
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Press Enter or click Add. Separate multiple keywords with a comma.
            </p>
          </div>
        </div>

        {/* Submit buttons - fixed at bottom */}
        <div className="p-4 bg-gray-950 border-t border-gray-800/50 flex gap-3">
          <Button
            type="button"
            onClick={() => handleSubmitAll(true)}
            disabled={isUploading}
            className="flex-1 border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmitAll(false)}
            disabled={isUploading || !isFileComplete(activeFile)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-800/50 disabled:cursor-not-allowed"
          >
            {isUploading ? "Submitting..." : "Submit for Review"}
          </Button>
        </div>
      </div>
    </div>
  );
}