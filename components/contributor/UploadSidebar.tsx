"use client";

import { useDispatch } from "react-redux";
import {
  X,
  Plus,
  Sparkles,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
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
import { updateFile, updateMultipleFiles } from "@/redux/features/uploadSlice"; // Import the new action
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
  // handleAddTag and handleRemoveTag will be redefined inside
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
  handleSubmitAll: (saveDraft: boolean) => void;
  isFileComplete: (file: UploadFile) => boolean;
};

export function UploadSidebar({
  files,
  activeFileIndex,
  setActiveFileIndex,
  newTag,
  setNewTag,
  // handleAddTag and handleRemoveTag are passed but we will use our own bulk-aware versions
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
  const isBulkEditing = selectedFiles.length > 1;

  // --- START OF FIX ---

  // 1. Generic handler to update one or many files
  const handleFieldChange = (data: Partial<UploadFile>) => {
    if (isBulkEditing) {
      dispatch(updateMultipleFiles({ indices: selectedFiles, data }));
    } else {
      dispatch(updateFile({ index: activeFileIndex, data }));
    }
  };

  // 2. Function to get a shared value from all selected files
  const getSharedValue = <K extends keyof UploadFile>(key: K): UploadFile[K] | undefined => {
    const firstValue = files[selectedFiles[0]][key];
    const allSame = selectedFiles.every(index => files[index][key] === firstValue);
    return allSame ? firstValue : undefined;
  };

  // 3. Define shared values for form inputs. If values are different, they will be undefined.
  const sharedValues = {
    title: isBulkEditing ? getSharedValue('title') : activeFile.title,
    description: isBulkEditing ? getSharedValue('description') : activeFile.description,
    category: isBulkEditing ? getSharedValue('category') : activeFile.category,
    license: isBulkEditing ? getSharedValue('license') : activeFile.license,
    imageType: isBulkEditing ? getSharedValue('imageType') : activeFile.imageType,
    aiGeneratedStatus: isBulkEditing ? getSharedValue('aiGeneratedStatus') : activeFile.aiGeneratedStatus,
  };

  // 4. Recalculate submit button states based on ALL selected files
  const filesBeingEdited = selectedFiles.map(index => files[index]);
  const isFileDraftable = (file: UploadFile) => Boolean(file.title?.trim());
  const canSaveSelectionAsDraft = filesBeingEdited.length > 0 && filesBeingEdited.every(isFileDraftable);
  const canSubmitSelectionForReview = filesBeingEdited.length > 0 && filesBeingEdited.every(isFileComplete);

  // 5. Bulk-aware tag handling
  const allSelectedTags = isBulkEditing
    ? [...new Set(selectedFiles.flatMap(index => files[index].tags || []))]
    : activeFile.tags;

  const handleAddTags = () => {
    if (!newTag.trim()) return;
    const tagsToAdd = newTag.split(',').map(tag => tag.trim()).filter(Boolean);
    if (tagsToAdd.length === 0) return;

    const indicesToUpdate = isBulkEditing ? selectedFiles : [activeFileIndex];
    indicesToUpdate.forEach(index => {
      const file = files[index];
      const currentTags = file.tags || [];
      const combined = [...new Set([...currentTags, ...tagsToAdd])];
      const finalTags = combined.slice(0, 50); // Enforce 50 tag limit
      if (combined.length > 50) {
        toast.warning(`Keyword limit reached for ${file.originalFileName}. Some tags were not added.`);
      }
      dispatch(updateFile({ index, data: { tags: finalTags } }));
    });
    setNewTag("");
  };

  const handleRemoveTagFromSelection = (tagToRemove: string) => {
    const indicesToUpdate = isBulkEditing ? selectedFiles : [activeFileIndex];
    indicesToUpdate.forEach(index => {
      const file = files[index];
      const newTags = (file.tags || []).filter(t => t !== tagToRemove);
      dispatch(updateFile({ index, data: { tags: newTags } }));
    });
  };

  // --- END OF FIX ---

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[400px] bg-gray-950 border-l border-gray-800/50 overflow-hidden z-50 flex flex-col h-screen shadow-xl max-h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
        <h3 className="text-lg font-medium text-white">
          {isBulkEditing ? `Edit ${selectedFiles.length} Images` : "Edit Image Details"}
        </h3>
        <button
          type="button"
          onClick={() => {
            if (confirm("Are you sure you want to permanently delete this image?")) {
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

        {/* Form fields - scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <div>
            <Label htmlFor="sidebar-title" className="text-gray-300 flex items-center">
              Title <span className="text-red-400 ml-1">*</span>
            </Label>
            <Input
              id="sidebar-title"
              value={sharedValues.title ?? ''}
              onChange={(e) => handleFieldChange({ title: e.target.value })}
              placeholder={isBulkEditing && sharedValues.title === undefined ? 'Multiple values' : 'Enter image title'}
              required
              className="mt-1 bg-gray-800 border-gray-700 text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <Label htmlFor="sidebar-description" className="text-gray-300">Description</Label>
            <Textarea
              id="sidebar-description"
              value={sharedValues.description ?? ''}
              onChange={(e) => handleFieldChange({ description: e.target.value })}
              placeholder={isBulkEditing && sharedValues.description === undefined ? 'Multiple values' : 'Describe your image'}
              rows={2}
              className="mt-1 bg-gray-800 border-gray-700 text-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sidebar-category">Category <span className="text-red-400 ml-1">*</span></Label>
              <Select
                value={sharedValues.category ?? ''}
                onValueChange={(value) => handleFieldChange({ category: value })}
              >
                <SelectTrigger id="sidebar-category" className="mt-1 bg-gray-800 border-gray-700 text-gray-200">
                  <SelectValue placeholder={isBulkEditing && sharedValues.category === undefined ? 'Multiple values' : 'Select category'} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border border-gray-700 text-gray-200">
                  {CATEGORY_OPTIONS.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sidebar-license">License</Label>
              <Select
                value={sharedValues.license ?? ''}
                onValueChange={(value) => handleFieldChange({ license: value })}
              >
                <SelectTrigger id="sidebar-license" className="mt-1 bg-gray-800 border-gray-700 text-gray-200">
                  <SelectValue placeholder={isBulkEditing && sharedValues.license === undefined ? 'Multiple values' : 'Select license'} />
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
              <Select
                value={sharedValues.imageType ?? ''}
                onValueChange={(value) => handleFieldChange({ imageType: value })}
              >
                <SelectTrigger id="sidebar-image-type" className="mt-1 bg-gray-800 border-gray-700 text-gray-200">
                  <SelectValue placeholder={isBulkEditing && sharedValues.imageType === undefined ? 'Multiple values' : 'Select type'} />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border border-gray-700 text-gray-200">
                  {IMAGE_TYPE_OPTIONS.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sidebar-ai-status" className="mb-2">AI Generated <span className="text-red-400 ml-1">*</span></Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="sidebar-ai-status"
                  checked={sharedValues.aiGeneratedStatus === "AI_GENERATED"}
                  onCheckedChange={(checked) => handleFieldChange({ aiGeneratedStatus: checked ? "AI_GENERATED" : "NOT_AI_GENERATED" })}
                />
                <span className="text-sm text-gray-400">
                  {sharedValues.aiGeneratedStatus === "AI_GENERATED" ? "Yes" : sharedValues.aiGeneratedStatus === "NOT_AI_GENERATED" ? "No" : "Mixed"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <Label>Keywords <span className="text-red-400 ml-1">*</span></Label>
            <div className="flex flex-wrap gap-2 mt-2 min-h-[40px] p-2 border rounded-md border-gray-700 bg-gray-900">
              {allSelectedTags.map((tag: string, tagIndex: number) => (
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

        {/* Submit buttons - fixed at bottom */}
        <div className="p-4 bg-gray-950 border-t border-gray-800/50 flex gap-3">
          <Button
            type="button"
            onClick={() => handleSubmitAll(true)}
            disabled={isUploading || !canSaveSelectionAsDraft}
            title={!canSaveSelectionAsDraft ? "All selected images must have a title to be saved." : "Save selected images as drafts"}
            className="flex-1 border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300"
          >
            Save as Draft
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmitAll(false)}
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