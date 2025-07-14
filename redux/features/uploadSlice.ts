// @redux/features/uploadSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UploadFile {
  id: string;
  /** URL for the watermarked preview, used in the contributor upload/drafts area. */
  previewUrl: string;
  /** NEW: Optional URL for the non-watermarked preview, for use in public galleries or detail pages. */
  cleanPreviewUrl?: string;
  originalFileName: string;
  title: string;
  description: string;
  tags: string[];
  license: 'STANDARD' | 'EXTENDED';
  category: string;
  imageType: 'JPG' | 'PNG';
  aiGeneratedStatus: 'NOT_AI_GENERATED' | 'AI_GENERATED';
  tempId?: string;
  status?: 'uploading' | 'processing' | 'error' | 'complete';
  progress?: number; // Progress from 0 to 100
  error?: string | null; // Error message for a specific file
  width: number | null;
  height: number | null;
}

interface UploadState {
  files: UploadFile[];
  isUploading: boolean; // This will represent the overall state
  error: string | null;
  success: string | null;
}

const initialState: UploadState = {
  files: [],
  isUploading: false,
  error: null,
  success: null,
};

// No changes are needed to the slice or its reducers. They will handle
// the new optional `cleanPreviewUrl` property automatically.
export const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    addFilesToQueue: (state, action: PayloadAction<UploadFile[]>) => {
      state.files.unshift(...action.payload);
      state.isUploading = true;
    },
    updateFileUploadState: (state, action: PayloadAction<{ tempId: string, data: Partial<UploadFile> }>) => {
      const { tempId, data } = action.payload;
      const fileIndex = state.files.findIndex(f => f.tempId === tempId);
      if (fileIndex !== -1) {
        state.files[fileIndex] = { ...state.files[fileIndex], ...data };
      }
    },
    setFiles: (state, action: PayloadAction<UploadFile[]>) => {
      state.files = action.payload.map(f => ({ ...f, status: 'complete' }));
    },
    updateFile: (state, action: PayloadAction<{ index: number, data: Partial<UploadFile> }>) => {
      const { index, data } = action.payload;
      if (index >= 0 && index < state.files.length) {
        state.files[index] = { ...state.files[index], ...data };
      }
    },
    updateMultipleFiles: (state, action: PayloadAction<{ indices: number[], data: Partial<UploadFile> }>) => {
      const { indices, data } = action.payload;
      indices.forEach(index => {
        if (index >= 0 && index < state.files.length) {
          state.files[index] = { ...state.files[index], ...data };
        }
      });
    },
    removeFileById: (state, action: PayloadAction<string>) => {
      state.files = state.files.filter((file) => file.id !== action.payload);
    },
    clearFiles: (state) => {
      state.files = [];
      state.error = null;
      state.success = null;
      state.isUploading = false;
    },
    setUploading: (state, action: PayloadAction<boolean>) => {
      state.isUploading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isUploading = false;
    },
    setSuccess: (state, action: PayloadAction<string | null>) => {
      state.success = action.payload;
    },
    resetUploadState: () => initialState,
  },
});

export const {
  addFilesToQueue,
  updateFileUploadState,
  setFiles,
  updateFile,
  updateMultipleFiles,
  removeFileById,
  clearFiles,
  setUploading,
  setError,
  setSuccess,
  resetUploadState
} = uploadSlice.actions;

export default uploadSlice.reducer;