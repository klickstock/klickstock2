// @redux/features/uploadSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// NEW: Add status and progress to the file interface
export interface UploadFile {
  // --- Core initial upload data ---
  id: string;
  previewUrl: string;
  originalFileName: string;
  // --- Metadata for submission ---
  title: string;
  description: string;
  tags: string[];
  license: string;
  category: string;
  imageType: string;
  aiGeneratedStatus: string;
  // --- NEW: Fields for tracking upload state ---
  // A temporary ID used during the upload process before a DB id is available
  tempId?: string;
  status?: 'uploading' | 'processing' | 'failed' | 'complete';
  progress?: number; // Progress from 0 to 100
  error?: string | null; // Error message for a specific file
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

export const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    // NEW: Adds files to the queue before upload starts
    addFilesToQueue: (state, action: PayloadAction<UploadFile[]>) => {
      state.files.unshift(...action.payload);
      state.isUploading = true;
    },
    // NEW: Updates a file's progress and status using a temporary ID
    updateFileUploadState: (state, action: PayloadAction<{ tempId: string, data: Partial<UploadFile> }>) => {
      const { tempId, data } = action.payload;
      const fileIndex = state.files.findIndex(f => f.tempId === tempId);
      if (fileIndex !== -1) {
        state.files[fileIndex] = { ...state.files[fileIndex], ...data };
      }
    },
    // Replaces the entire file list, useful after fetching from server
    setFiles: (state, action: PayloadAction<UploadFile[]>) => {
      // Add 'complete' status to fetched files
      state.files = action.payload.map(f => ({ ...f, status: 'complete' }));
    },
    // Updates a specific file's metadata by its DB id
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
    // Removes a file from the list by its DB id
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