"use client";

import React, { useCallback, useState } from 'react';
import { Upload, File as FileIcon } from 'lucide-react';

interface FileUploadProps {
  onFileSelect?: (files: File[]) => void;
  onAnalyze?: (files: File[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function FileUpload({ 
  onFileSelect, 
  onAnalyze, 
  isLoading = false,
  disabled = false 
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleCallback = (selectedFiles: File[]) => {
    if (onFileSelect) {
      onFileSelect(selectedFiles);
    } else if (onAnalyze) {
      onAnalyze(selectedFiles);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter((droppedFile) => droppedFile.name.endsWith('.csv'));
      if (droppedFiles.length > 0) {
        setFiles(droppedFiles);
        handleCallback(droppedFiles);
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files).filter((selectedFile) => selectedFile.name.endsWith('.csv'));
      if (selectedFiles.length > 0) {
        setFiles(selectedFiles);
        handleCallback(selectedFiles);
      }
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative w-full rounded-xl border-2 border-dashed p-8 transition-all duration-300 ${
          dragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || isLoading}
        />

        <div className="flex flex-col items-center justify-center text-center">
          {files.length > 0 ? (
            <>
              <FileIcon className="mb-3 h-12 w-12 text-blue-400" />
              <p className="text-lg font-semibold text-white">
                {files.length === 1 ? files[0].name : `${files.length} CSV files selected`}
              </p>
              <p className="text-sm text-slate-400">
                {files.length === 1
                  ? `${(files[0].size / 1024).toFixed(2)} KB`
                  : 'Ready for cross-file analysis'}
              </p>
              <p className="mt-2 text-xs text-blue-400">Click to change files</p>
            </>
          ) : (
            <>
              <Upload className="mb-3 h-12 w-12 text-slate-400" />
              <p className="text-lg font-semibold text-white">
                Drag & drop one or more CSV files
              </p>
              <p className="mt-1 text-sm text-slate-400">
                or click to browse and compare files together
              </p>
            </>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <button
          className={`mt-4 w-full rounded-lg px-6 py-3 font-semibold transition-all duration-300 ${
            isLoading || disabled
              ? 'cursor-not-allowed bg-slate-700 text-slate-400'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]'
          }`}
          disabled={disabled || isLoading}
          onClick={() => handleCallback(files)}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Analyzing...
            </span>
          ) : (
            files.length > 1 ? 'Generate Multi-File Insights' : 'Generate AI Insights'
          )}
        </button>
      )}
    </div>
  );
}
