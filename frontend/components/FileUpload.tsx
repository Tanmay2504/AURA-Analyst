"use client";
import React, { useCallback, useState } from 'react';

interface FileUploadProps {
  onAnalyze: (file: File) => void;
  isLoading: boolean;
}

export default function FileUpload({ onAnalyze, isLoading }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center">
      <div 
        className="w-full h-48 border-2 border-dashed border-blue-400 rounded-xl flex flex-col items-center justify-center bg-blue-50/50 hover:bg-blue-50 transition cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input 
          id="file-upload"
          type="file" 
          accept=".csv"
          className="hidden" 
          onChange={(e) => e.target.files && setFile(e.target.files[0])}
        />
        {file ? (
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-700">{file.name}</p>
            <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div className="text-center p-4">
            <p className="text-lg font-medium text-slate-700">Drag & Drop your CSV file here</p>
            <p className="text-sm text-slate-500 mt-2">or click to browse</p>
          </div>
        )}
      </div>

      <button 
        className={`mt-6 px-8 py-3 rounded-lg font-bold text-white transition-all shadow-md ${!file || isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}`}
        disabled={!file || isLoading}
        onClick={() => file && onAnalyze(file)}
      >
        {isLoading ? 'Analyzing Data with AI...' : 'Generate Insights'}
      </button>
    </div>
  );
}
