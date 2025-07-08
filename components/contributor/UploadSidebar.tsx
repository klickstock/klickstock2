"use client";

import { useDispatch } from "react-redux";
import {
  X,
  Plus,
  Sparkles,
  Trash2
} from "lucide-react";
import { toast } from "react-hot-toast"; // <--- CHANGED: Switched to react-hot-toast
import { Button } from "@/components/ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { updateFile, updateMultipleFiles } from "@/redux/features/uploadSlice";
import { UploadFile } from "@/redux/features/uploadSlice";
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
  files: UploadFile[];
  activeFileIndex: number | null;
  setActiveFileIndex: (index: number | null) => void;
  newTag: string;
  setNewTag: (tag: string) => void;
  handleAddTag: (index: number) => void;
  handleRemoveTag: (fileIndex: number, tagIndex: number) => void;
  handleRemoveFile: (index: number) => void;
  selectedFiles: number[];
  isGenerating: boolean;
  isGeneratingBulk: boolean;
  generateContentWithAI: () => void;
  generateContentWithAIForAll?: () => void;
  isUploading: boolean;
  transparentImages: { [key: string]: boolean | null };
  handleSubmitAll: () => void;
  handleSaveProgress: () => void;
  isFileComplete: (file: UploadFile) => boolean;
};

export function UploadSidebar({
  files,
  activeFileIndex,
  setActiveFileIndex,
  newTag,
  setNewTag,
  // handleAddTag and handleRemoveTag are no longer used directly, but the props are kept for potential future use if logic changes
  handleRemoveFile,
  selectedFiles,
  isGenerating,
  isGeneratingBulk,
  generateContentWithAI,
  generateContentWithAIForAll,
  isUploading,
  transparentImages,
  handleSubmitAll,
  handleSaveProgress,
  isFileComplete
}: UploadSidebarProps) {
  const dispatch = useDispatch();

  if (activeFileIndex === null || !files[activeFileIndex]) {
    return null;
  }

  const activeFile = files[activeFileIndex];
  const isBulkEditing = selectedFiles.length > 1;

  const handleFieldChange = (data: Partial<UploadFile>) => {
    // This function correctly applies changes to ALL selected files if in bulk mode
    if (isBulkEditing) {
      dispatch(updateMultipleFiles({ indices: selectedFiles, data }));
    } else {
      dispatch(updateFile({ index: activeFileIndex, data }));
    }
  };


  const filesBeingEdited = selectedFiles.map(index => files[index]);
  const canSubmitSelectionForReview = filesBeingEdited.length > 0 && filesBeingEdited.every(isFileComplete);

  // --- CHANGED: Display tags only from the active file ---
  const tagsToDisplay = activeFile.tags || [];

  const handleAddTags = () => {
    if (!newTag.trim()) return;
    const tagsToAdd = newTag.split(',').map(tag => tag.trim()).filter(Boolean);
    if (tagsToAdd.length === 0) return;

    // This logic correctly applies new tags to ALL selected files
    const indicesToUpdate = isBulkEditing ? selectedFiles : [activeFileIndex];
    indicesToUpdate.forEach(index => {
      const file = files[index];
      const currentTags = file.tags || [];
      const combined = [...new Set([...currentTags, ...tagsToAdd])];
      const finalTags = combined.slice(0, 50);
      if (combined.length > 50) {
        toast.error(`Keyword limit reached for ${file.originalFileName}. Some tags were not added.`);
      }
      dispatch(updateFile({ index, data: { tags: finalTags } }));
    });
    setNewTag("");
  };

  const handleRemoveTagFromSelection = (tagToRemove: string) => {
    // This logic correctly removes a tag from ALL selected files
    const indicesToUpdate = isBulkEditing ? selectedFiles : [activeFileIndex];
    indicesToUpdate.forEach(index => {
      const file = files[index];
      const newTags = (file.tags || []).filter(t => t !== tagToRemove);
      dispatch(updateFile({ index, data: { tags: newTags } }));
    });
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[400px] bg-gray-950 border-l border-gray-800/50 overflow-hidden z-50 flex flex-col h-screen shadow-xl max-h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
        <h3 className="text-lg font-medium text-white">
          {isBulkEditing ? `Edit ${selectedFiles.length} Images` : "Edit Image Details"}
        </h3>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Are you sure you want to permanently delete the image "${activeFile.originalFileName}"?`)) {
              handleRemoveFile(activeFileIndex);
            }
          }}
          className="h-10 w-10 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 rounded-lg flex items-center justify-center transition-all duration-200"
          aria-label="Delete image"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-gray-900/30 border-b border-gray-800/50">
          <div className="relative h-48 rounded-lg overflow-hidden bg-gray-900 group border border-gray-700/50">
            {activeFile.imageType === "PNG" && transparentImages[activeFile.id] && (
              <div
                className="absolute inset-0 bg-[length:16px_16px] bg-[linear-gradient(45deg,#1f2937_25%,transparent_25%,transparent_75%,#1f2937_75%,#1f2937),linear-gradient(45deg,#1f2937_25%,transparent_25%,transparent_75%,#1f2937_75%,#1f2937)]"
                style={{
                  backgroundPosition: "0 0, 8px 8px",
                  backgroundSize: "16px 16px",
                  zIndex: 0
                }}
              />
            )}
            <img
              src={activeFile.previewUrl}
              alt={activeFile.title || `Image ${activeFileIndex + 1}`}
              className={`w-full h-full pointer-events-none ${activeFile.imageType === "PNG" && transparentImages[activeFile.id] ? "object-contain" : "object-cover"}`}
              style={{ position: "relative", zIndex: 1 }}
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <div>
            <Label htmlFor="sidebar-title" className="text-gray-300 flex items-center">
              Title <span className="text-red-400 ml-1">*</span>
              {isBulkEditing && <Badge variant="secondary" className="ml-2">Editing {selectedFiles.length}</Badge>}
            </Label>
            {/* --- CHANGED: Value now comes directly from activeFile --- */}
            <Input
              id="sidebar-title"
              value={activeFile.title || ''}
              onChange={(e) => handleFieldChange({ title: e.target.value })}
              placeholder="Enter image title"
              required
              className="mt-1 bg-gray-800 border-gray-700 text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <Label htmlFor="sidebar-description" className="text-gray-300">Description</Label>
            {/* --- CHANGED: Value now comes directly from activeFile --- */}
            <Textarea
              id="sidebar-description"
              value={activeFile.description || ''}
              onChange={(e) => handleFieldChange({ description: e.target.value })}
              placeholder="Describe your image"
              rows={2}
              className="mt-1 bg-gray-800 border-gray-700 text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sidebar-category">Category <span className="text-red-400 ml-1">*</span></Label>
              {/* --- CHANGED: Value now comes directly from activeFile --- */}
              <Select
                value={activeFile.category || ''}
                onValueChange={(value) => handleFieldChange({ category: value })}
              >
                <SelectTrigger id="sidebar-category" className="mt-1 bg-gray-800 border-gray-700 text-gray-200">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border border-gray-700 text-gray-200">
                  {CATEGORY_OPTIONS.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sidebar-license">License</Label>
              {/* --- CHANGED: Value now comes directly from activeFile --- */}
              <Select
                value={activeFile.license || ''}
                onValueChange={(value) => handleFieldChange({ license: value })}
              >
                <SelectTrigger id="sidebar-license" className="mt-1 bg-gray-800 border-gray-700 text-gray-200">
                  <SelectValue placeholder="Select license" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border border-gray-700 text-gray-200">
                  {LICENSE_OPTIONS.map((lic) => <SelectItem key={lic.value} value={lic.value}>{lic.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <Label htmlFor="sidebar-image-type">Image Type <span className="text-red-400 ml-1">*</span></Label>
              {/* --- CHANGED: Value now comes directly from activeFile --- */}
              <Select
                value={activeFile.imageType || ''}
                onValueChange={(value) => handleFieldChange({ imageType: value })}
              >
                <SelectTrigger id="sidebar-image-type" className="mt-1 bg-gray-800 border-gray-700 text-gray-200">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border border-gray-700 text-gray-200">
                  {IMAGE_TYPE_OPTIONS.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sidebar-ai-status" className="mb-2">AI Generated <span className="text-red-400 ml-1">*</span></Label>
              <div className="flex items-center gap-2">
                {/* --- CHANGED: Checked state now comes directly from activeFile --- */}
                <Switch
                  id="sidebar-ai-status"
                  checked={activeFile.aiGeneratedStatus === "AI_GENERATED"}
                  onCheckedChange={(checked) => handleFieldChange({ aiGeneratedStatus: checked ? "AI_GENERATED" : "NOT_AI_GENERATED" })}
                />
                <span className="text-sm text-gray-400">
                  {activeFile.aiGeneratedStatus === "AI_GENERATED" ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <Label>Keywords <span className="text-red-400 ml-1">*</span></Label>
            <div className="flex flex-wrap gap-2 mt-2 min-h-[40px] p-2 border rounded-md border-gray-700 bg-gray-900">
              {/* --- CHANGED: Now iterates over tagsToDisplay (from active file) --- */}
              {tagsToDisplay.map((tag: string, tagIndex: number) => (
                <Badge key={`${tag}-${tagIndex}`} className="gap-1 bg-indigo-900/60 text-indigo-300">
                  {tag}
                  <button type="button" onClick={() => handleRemoveTagFromSelection(tag)} className="ml-1 text-indigo-300 hover:text-indigo-100">
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
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTags();
                  }
                }}
                className="bg-gray-800 border-gray-700 text-gray-200"
              />
              <Button type="button" onClick={handleAddTags} className="bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700">
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-950 border-t border-gray-800/50 flex gap-3">
          <Button
            type="button"
            onClick={handleSaveProgress}
            disabled={isUploading || selectedFiles.length === 0}
            title="Save your editing progress to your browser's local storage."
            className="flex-1 border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300"
          >
            Save Progress
          </Button>
          <Button
            type="button"
            onClick={handleSubmitAll}
            disabled={isUploading || !canSubmitSelectionForReview}
            title={!canSubmitSelectionForReview ? "All selected images must have all required fields completed." : "Submit selected images for review"}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isUploading ? "Submitting..." : `Submit ${selectedFiles.length} item(s)`}
          </Button>
        </div>
      </div>
    </div>
  );
}