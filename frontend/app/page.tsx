"use client";

import { useState, useEffect } from "react";
import AuraHero from "@/components/ui/hero";
import FileUpload from "@/components/FileUpload";
import AnalysisDashboard from "@/components/AnalysisDashboard";
import { AlertCircle, Loader, CheckCircle, History } from "lucide-react";

interface AnalysisData {
  id: number;
  filename: string;
  summary: string;
  insights: string[];
  chart_data: Record<string, unknown>;
  created_at: string;
}

export default function Home() {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [historyData, setHistoryData] = useState<AnalysisData[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch analysis history
  const fetchHistory = async () => {
    try {
      const response = await fetch("http://localhost:8000/history?limit=10");
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      setHistoryData(data.records || []);
      setShowHistory(true);
    } catch (err) {
      setError("Could not load analysis history");
    }
  };

  // Handle file analysis
  const handleAnalyze = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      return;
    }

    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Analysis failed");
      }

      const data: AnalysisData = await response.json();
      setAnalysisData(data);
      setError("");

      // Refresh history
      await fetchHistory();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setAnalysisData(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle loading analysis from history
  const handleLoadFromHistory = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8000/analysis/${id}`);
      if (!response.ok) throw new Error("Failed to load analysis");
      const data: AnalysisData = await response.json();
      setAnalysisData(data);
      setShowHistory(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError("Could not load analysis record");
    }
  };

  return (
    <div className="w-full bg-slate-950">
      {/* Hero Section */}
      {!showAnalyzer && (
        <div
          onClick={() => {
            setShowAnalyzer(true);
            setTimeout(() => {
              document
                .getElementById("analyzer")
                ?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }}
        >
          <AuraHero />
        </div>
      )}

      {/* Main Content */}
      <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          {/* Analyzer Section */}
          <div
            id="analyzer"
            className={`transition-all duration-500 ${
              showAnalyzer ? "block" : "hidden"
            }`}
          >
            <div className="mb-8">
              <h2 className="mb-2 text-4xl font-bold text-white">
                Analyze Your Data
              </h2>
              <p className="text-slate-400">
                Upload a CSV file to get instant AI-powered insights and visualizations
              </p>
            </div>

            {/* Upload Section */}
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Upload Card */}
              <div className="lg:col-span-1">
                <FileUpload
                  onFileSelect={handleAnalyze}
                  disabled={loading}
                  isLoading={loading}
                />

                {/* History Button */}
                <button
                  onClick={() => {
                    setShowHistory(!showHistory);
                    fetchHistory();
                  }}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-200 transition-all hover:border-purple-400 hover:bg-slate-700"
                >
                  <History className="h-4 w-4" />
                  View History ({historyData.length})
                </button>
              </div>

              {/* Results Section */}
              <div className="lg:col-span-2">
                {loading && (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 py-16">
                    <Loader className="mb-4 h-12 w-12 animate-spin text-blue-400" />
                    <p className="text-lg text-slate-200">
                      Analyzing your data with AI...
                    </p>
                    <p className="text-sm text-slate-400">
                      This usually takes 10-30 seconds
                    </p>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                    <AlertCircle className="mt-1 h-5 w-5 flex-shrink-0 text-red-400" />
                    <div>
                      <h3 className="font-semibold text-red-400">Error</h3>
                      <p className="text-sm text-slate-300">{error}</p>
                    </div>
                  </div>
                )}

                {analysisData && !loading && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <span className="text-sm text-green-300">
                        Analysis complete!
                      </span>
                    </div>
                    <AnalysisDashboard
                      summary={analysisData.summary}
                      insights={analysisData.insights}
                      chartData={analysisData.chart_data}
                      filename={analysisData.filename}
                    />
                  </div>
                )}

                {!loading && !error && !analysisData && (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-600 py-16">
                    <div className="mb-4 text-4xl">📊</div>
                    <p className="text-lg text-slate-300">
                      Upload a CSV file to begin
                    </p>
                    <p className="text-sm text-slate-500">
                      Your analysis results will appear here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* History Modal */}
          {showHistory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
              <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-white">
                    Analysis History
                  </h3>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {historyData.length === 0 ? (
                  <p className="text-center text-slate-400">
                    No analysis history yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {historyData.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleLoadFromHistory(item.id)}
                        className="w-full rounded-lg border border-slate-600 bg-slate-700/50 p-4 text-left transition-all hover:border-blue-400 hover:bg-slate-700"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-white">
                              {item.filename}
                            </p>
                            <p className="text-sm text-slate-400">
                              {new Date(item.created_at).toLocaleString()}
                            </p>
                            <p className="mt-1 line-clamp-1 text-sm text-slate-300">
                              {item.summary}
                            </p>
                          </div>
                          <div className="text-blue-400">→</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll to Analyzer Anchor */}
      {!showAnalyzer && (
        <button
          onClick={() => {
            setShowAnalyzer(true);
            setTimeout(() => {
              document
                .getElementById("analyzer")
                ?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }}
          className="fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition-all hover:bg-blue-700 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]"
        >
          ↓
        </button>
      )}
    </div>
  );
}
