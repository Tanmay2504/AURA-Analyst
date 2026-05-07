"use client";
import React, { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import AnalysisDashboard from '@/components/AnalysisDashboard';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [error, setError] = useState("");

  const handleAnalyze = async (file: File) => {
    setLoading(true);
    setError("");
    setAnalysisData(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Calls local FastAPI server
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze data");
      }

      const data = await response.json();
      setAnalysisData(data.analysis);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center py-16 px-4 sm:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 tracking-tight">
          AI Data Analyst Agent
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Upload your raw CSV data and let Gemini 3.1 Pro act as your statistical consultant to instantly uncover insights and generate visualizations.
        </p>
      </div>

      <FileUpload onAnalyze={handleAnalyze} isLoading={loading} />

      {error && (
        <div className="mt-8 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg max-w-xl w-full text-center">
          {error}
        </div>
      )}

      {analysisData && (
        <AnalysisDashboard data={analysisData} />
      )}
    </main>
  );
}
