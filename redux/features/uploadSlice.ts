// redux/features/uploadSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// This interface now represents an ALREADY uploaded file waiting for metadata.
export interface UploadFile {
  id: string; // This is the ID from the InitialUpload model
  previewUrl: string; // This will be a signed URL from S3
  originalFileName: string;
  title: string;
  description: string;
  tags: string[];
  license: string;
  category: string;
  imageType: string;
  aiGeneratedStatus: string;
}

interface UploadState {
  files: UploadFile[];
  isUploading: boolean; // Will now be true during the initial file transfer
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
    // Replaces the entire file list, useful after fetching from server
    setFiles: (state, action: PayloadAction<UploadFile[]>) => {
      state.files = action.payload;
    },
    // Updates a specific file's metadata
    updateFile: (state, action: PayloadAction<{ index: number, data: Partial<UploadFile> }>) => {
      const { index, data } = action.payload;
      if (index >= 0 && index < state.files.length) {
        state.files[index] = { ...state.files[index], ...data };
      }
    },
    // Removes a file from the list (e.g., after successful deletion from server)
    removeFileById: (state, action: PayloadAction<string>) => {
      state.files = state.files.filter((file) => file.id !== action.payload);
    },
    // Clears all files, e.g., after successful submission
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
    // Reset the entire state
    resetUploadState: () => initialState,
  },
});

export const {
  setFiles,
  updateFile,
  removeFileById,
  clearFiles,
  setUploading,
  setError,
  setSuccess,
  resetUploadState
} = uploadSlice.actions;

export default uploadSlice.reducer;