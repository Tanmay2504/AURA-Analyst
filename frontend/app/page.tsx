"use client";

import { useState, useEffect } from "react";
import AuraHero from "@/components/ui/hero";
import FileUpload from "@/components/FileUpload";
import AnalysisDashboard from "@/components/AnalysisDashboard";
import AIModelSelector from "@/components/AIModelSelector";
import NLQueryChat from "@/components/NLQueryChat";
import ColumnAnalysisPanel from "@/components/ColumnAnalysisPanel";
import ExportButton from "@/components/ExportButton";
import { AlertCircle, Loader, CheckCircle, History, Home as HomeIcon, Settings } from "lucide-react";

const BEDROCK_MODEL_OPTIONS = [
  {
    label: "Claude Sonnet 4.6 - recommended",
    value: "arn:aws:bedrock:us-east-1:699038657654:inference-profile/us.anthropic.claude-sonnet-4-6",
  },
  {
    label: "Claude Sonnet 4 - stable",
    value: "arn:aws:bedrock:us-east-1:699038657654:inference-profile/us.anthropic.claude-sonnet-4-20250514-v1:0",
  },
  {
    label: "Claude Opus 4.6 - strongest reasoning",
    value: "arn:aws:bedrock:us-east-1:699038657654:inference-profile/us.anthropic.claude-opus-4-6-v1",
  },
  {
    label: "Claude Haiku 4.5 - fastest fallback",
    value: "arn:aws:bedrock:us-east-1:699038657654:inference-profile/us.anthropic.claude-haiku-4-5-20251001-v1:0",
  },
];

const LIVE_AGENT_STEPS = [
  "Data Custodian cleaning data...",
  "Statistical Researcher identifying trends...",
  "Business Reporter synthesizing insight...",
];

interface AnalysisData {
  id: number;
  filename: string;
  summary: string;
  insights: string[];
  chart_data: Record<string, unknown>;
  forecast_data?: {
    available?: boolean;
    method?: string;
    date_column?: string;
    target_column?: string;
    horizon_days?: number;
    points?: Array<{ date: string; value: number }>;
    reason?: string;
  } | null;
  analysis_metadata?: {
    dataset_type?: string;
    date_column?: string | null;
    target_column?: string | null;
    category_column?: string | null;
    chart_title?: string;
    series_label?: string;
    rows?: number;
    columns?: number;
  } | null;
  agent_status?: string[];
  created_at: string;
}

interface BatchConnections {
  summary: string;
  shared_patterns: string[];
  key_differences: string[];
  recommended_storyline: string;
  insight_connections: string[];
}

interface BatchAnalysisData {
  total_files: number;
  datasets: AnalysisData[];
  connections: BatchConnections;
  metadata: {
    file_count?: number;
    filenames?: string[];
    dataset_types?: string[];
  };
}

export default function Home() {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [batchAnalysisData, setBatchAnalysisData] = useState<BatchAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [historyData, setHistoryData] = useState<AnalysisData[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [liveAgentLog, setLiveAgentLog] = useState<string[]>(LIVE_AGENT_STEPS);
  const [selectedBedrockModel, setSelectedBedrockModel] = useState<string | undefined>(undefined);
  const [columnNames, setColumnNames] = useState<string[]>([]);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }

    setLoadingStep(0);
    setLiveAgentLog(LIVE_AGENT_STEPS);

    const interval = window.setInterval(() => {
      setLoadingStep((current) => Math.min(current + 1, LIVE_AGENT_STEPS.length - 1));
    }, 2200);

    return () => window.clearInterval(interval);
  }, [loading]);

  // Fetch analysis history
  const fetchHistory = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/history?limit=10`);
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      setHistoryData(data.records || []);
      setShowHistory(true);
    } catch (err) {
      setError("Could not load analysis history");
    }
  };

  // Handle file analysis
  const handleAnalyze = async (selectedFiles: File | File[]) => {
    const files = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
    const csvFiles = files.filter((file) => file.name.endsWith(".csv"));

    if (csvFiles.length === 0) {
      setError("Please upload at least one CSV file");
      return;
    }

    setError("");
    setLoading(true);
    setLoadingStep(0);
    setLiveAgentLog(LIVE_AGENT_STEPS);
    setAnalysisData(null);
    setBatchAnalysisData(null);

    const formData = new FormData();
    const isBatch = csvFiles.length > 1;
    if (isBatch) {
      csvFiles.forEach((file) => formData.append("files", file));
    } else {
      formData.append("file", csvFiles[0]);
    }
    if (selectedBedrockModel) formData.append("model_id", selectedBedrockModel);

    try {
      const endpoint = isBatch
        ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/analyze/batch`
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/analyze`;
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Analysis failed");
      }

      const data = await response.json();
      if (isBatch) {
        setBatchAnalysisData(data as BatchAnalysisData);
      } else {
        const singleData = data as AnalysisData;
        setAnalysisData(singleData);
        setLiveAgentLog(singleData.agent_status?.length ? singleData.agent_status : LIVE_AGENT_STEPS);
        // Fetch real column names from the stored CSV
        try {
          const colRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/columns/${singleData.id}`);
          if (colRes.ok) {
            const colData = await colRes.json();
            setColumnNames(colData.columns || []);
          }
        } catch { /* non-critical */ }
      }
      setError("");

      // Refresh history
      await fetchHistory();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setAnalysisData(null);
      setBatchAnalysisData(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle loading analysis from history
  const handleLoadFromHistory = async (id: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/analysis/${id}`);
      if (!response.ok) throw new Error("Failed to load analysis");
      const data: AnalysisData = await response.json();
      setAnalysisData(data);
      setShowHistory(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError("Could not load analysis record");
    }
  };

  const handleGoHome = () => {
    setAnalysisData(null);
    setBatchAnalysisData(null);
    setError("");
    setShowHistory(false);
    setShowAnalyzer(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <h2 className="mb-2 text-4xl font-bold text-white">
                  Analyze Your Data
                </h2>
                <p className="text-slate-400">
                  Upload a CSV file to get instant AI-powered insights and visualizations
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGoHome}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 transition-all hover:border-slate-400 hover:bg-slate-700"
                >
                  <HomeIcon className="h-4 w-4" />
                  Home
                </button>
                <a
                  href="/admin"
                  title="Admin Settings"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-400 transition-all hover:border-slate-500 hover:text-slate-200 hover:bg-slate-700"
                >
                  <Settings className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Upload Section */}
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Upload Card */}
              <div className="lg:col-span-1">
                <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/70 p-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-200">
                    Bedrock model for single-file analysis
                  </label>
                  <AIModelSelector
                    selectedModel={selectedBedrockModel}
                    onModelSelect={(modelId) => setSelectedBedrockModel(modelId)}
                    apiUrl={process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    Choose a model suitable for your analysis. The selector pulls a curated list from the backend.
                  </p>
                </div>

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
                  <div className="space-y-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-6">
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Loader className="mb-4 h-12 w-12 animate-spin text-blue-400" />
                      <p className="text-lg text-slate-200">
                        Analyzing your data with AI...
                      </p>
                      <p className="text-sm text-slate-400">
                        This usually takes 10-30 seconds
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
                      <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                        Agent Status
                      </p>
                      <div className="space-y-2">
                        {LIVE_AGENT_STEPS.map((step, index) => (
                          <div
                            key={step}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                              index <= loadingStep
                                ? "bg-blue-500/10 text-blue-200"
                                : "bg-slate-800/40 text-slate-500"
                            }`}
                          >
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                index <= loadingStep ? "bg-blue-400" : "bg-slate-600"
                              }`}
                            />
                            <span className="text-sm">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
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

                {batchAnalysisData && !loading && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4">
                      <CheckCircle className="h-5 w-5 text-cyan-400" />
                      <span className="text-sm text-cyan-300">
                        Multi-file analysis complete for {batchAnalysisData.total_files} CSV files. Each file was analyzed locally first, then Gemini connected the findings.
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-bold text-white">Cross-File AI Connections</h3>
                          <p className="text-sm text-slate-400">
                            Gemini synthesized how these datasets relate to each other.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                            Executive Summary
                          </p>
                          <p className="text-slate-200">{batchAnalysisData.connections.summary}</p>
                        </div>

                        {batchAnalysisData.connections.recommended_storyline && (
                          <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                              Recommended Storyline
                            </p>
                            <p className="text-slate-200">{batchAnalysisData.connections.recommended_storyline}</p>
                          </div>
                        )}

                        {batchAnalysisData.connections.shared_patterns.length > 0 && (
                          <div>
                            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                              Shared Patterns
                            </p>
                            <ul className="space-y-2">
                              {batchAnalysisData.connections.shared_patterns.map((item) => (
                                <li key={item} className="rounded-lg bg-slate-800/50 px-4 py-3 text-slate-300">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {batchAnalysisData.connections.key_differences.length > 0 && (
                          <div>
                            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                              Key Differences
                            </p>
                            <ul className="space-y-2">
                              {batchAnalysisData.connections.key_differences.map((item) => (
                                <li key={item} className="rounded-lg bg-slate-800/50 px-4 py-3 text-slate-300">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {batchAnalysisData.connections.insight_connections.length > 0 && (
                          <div>
                            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                              Insight Connections
                            </p>
                            <ul className="space-y-2">
                              {batchAnalysisData.connections.insight_connections.map((item) => (
                                <li key={item} className="rounded-lg bg-slate-800/50 px-4 py-3 text-slate-300">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      {batchAnalysisData.datasets.map((dataset) => (
                        <div key={dataset.id} className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
                          <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
                            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                              Executive Summary - {dataset.filename}
                            </p>
                            <p className="text-slate-200">{dataset.summary}</p>
                          </div>
                          <AnalysisDashboard
                            summary={dataset.summary}
                            insights={dataset.insights}
                            chartData={dataset.chart_data}
                            forecastData={dataset.forecast_data}
                            analysisMetadata={dataset.analysis_metadata}
                            filename={dataset.filename}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysisData && !loading && !batchAnalysisData && (
                  <div className="space-y-4">
                    {/* Success bar + Export button */}
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span className="text-sm text-green-300">Analysis complete!</span>
                      </div>
                      <ExportButton
                        targetId="analysis-dashboard-export"
                        filename={analysisData.filename}
                        insights={analysisData.insights}
                        chartData={analysisData.chart_data}
                      />
                    </div>

                    {/* Dashboard (wrapped with export id) */}
                    <div id="analysis-dashboard-export">
                      <AnalysisDashboard
                        summary={analysisData.summary}
                        insights={analysisData.insights}
                        chartData={analysisData.chart_data}
                        forecastData={analysisData.forecast_data}
                        analysisMetadata={analysisData.analysis_metadata}
                        filename={analysisData.filename}
                      />
                    </div>

                    {/* NL Query Chat */}
                    <NLQueryChat
                      analysisId={analysisData.id}
                      filename={analysisData.filename}
                    />

                    {/* Column Deep-Dive */}
                    <ColumnAnalysisPanel
                      analysisId={analysisData.id}
                      columns={columnNames.length > 0 ? columnNames : (
                        (() => {
                          const cols: string[] = [];
                          if (analysisData.analysis_metadata?.date_column) cols.push(analysisData.analysis_metadata.date_column);
                          if (analysisData.analysis_metadata?.target_column) cols.push(analysisData.analysis_metadata.target_column);
                          if (analysisData.analysis_metadata?.category_column) cols.push(analysisData.analysis_metadata.category_column);
                          return cols;
                        })()
                      )}
                    />

                    {(analysisData.agent_status?.length || liveAgentLog.length > 0) && (
                      <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-6">
                        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
                          Agent Status Log
                        </p>
                        <div className="space-y-2">
                          {(analysisData.agent_status?.length ? analysisData.agent_status : liveAgentLog).map((message) => (
                            <div key={message} className="flex items-center gap-3 rounded-lg bg-slate-800/60 px-3 py-2 text-sm text-slate-300">
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                              <span>{message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
