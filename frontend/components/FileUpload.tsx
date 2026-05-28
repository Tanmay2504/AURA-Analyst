"use client";

import React, { useCallback, useState } from 'react';

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
    if (onFileSelect) onFileSelect(selectedFiles);
    else if (onAnalyze) onAnalyze(selectedFiles);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.length) {
      const dropped = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
      if (dropped.length) { setFiles(dropped); handleCallback(dropped); }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const selected = Array.from(e.target.files).filter(f => f.name.endsWith('.csv'));
      if (selected.length) { setFiles(selected); handleCallback(selected); }
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Drop zone */}
      <div
        className={`relative w-full border border-dashed p-6 transition-all duration-200 text-center
          ${dragActive
            ? 'border-[#f97316] bg-[#f97316]/5'
            : files.length > 0
              ? 'border-[#4ade80]/40 bg-[#4ade80]/5'
              : 'border-[#2a2a1e] hover:border-[#f97316]/40 hover:bg-[#f97316]/5'
          }
          ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById('file-upload-input')?.click()}
      >
        <input
          id="file-upload-input"
          type="file"
          accept=".csv"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || isLoading}
        />

        {files.length > 0 ? (
          <div>
            <div className="font-mono text-xs text-[#4ade80] mb-1">✓ file_loaded</div>
            <div className="font-mono text-sm font-bold text-[#e8e0cc] truncate">
              {files.length === 1 ? files[0].name : `${files.length} csv files selected`}
            </div>
            <div className="font-mono text-[10px] text-[#7a7060] mt-1">
              {files.length === 1
                ? `${(files[0].size / 1024).toFixed(1)} KB`
                : 'ready for cross-file analysis'}
            </div>
            <div className="font-mono text-[10px] text-[#f97316] mt-2">// click to change</div>
          </div>
        ) : (
          <div>
            <div className="font-mono text-2xl text-[#2a2a1e] mb-3 select-none">
              {dragActive ? '▼' : '▓'}
            </div>
            <div className="font-mono text-xs font-bold text-[#e8e0cc] mb-1">
              {dragActive ? 'drop_file_here' : 'drag_and_drop_csv'}
            </div>
            <div className="font-mono text-[10px] text-[#3d3a2e]">
              or click to browse · supports multiple files
            </div>
          </div>
        )}
      </div>

      {/* Analyze button */}
      {files.length > 0 && (
        <button
          className={`w-full btn-amber py-2.5 text-xs ${(isLoading || disabled) ? 'opacity-40 pointer-events-none' : ''}`}
          disabled={disabled || isLoading}
          onClick={() => handleCallback(files)}
        >
          <span className="flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <span className="blink">█</span>
                <span>analyzing...</span>
              </>
            ) : (
              <span>
                $ aura analyze {files.length > 1 ? `--batch ${files.length}` : files[0]?.name}
              </span>
            )}
          </span>
        </button>
      )}
    </div>
  );
}
