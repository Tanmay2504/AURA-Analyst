"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuraHero from "@/components/ui/hero";
import FileUpload from "@/components/FileUpload";
import AnalysisDashboard from "@/components/AnalysisDashboard";
import AIModelSelector from "@/components/AIModelSelector";
import NLQueryChat from "@/components/NLQueryChat";
import ColumnAnalysisPanel from "@/components/ColumnAnalysisPanel";
import ExportButton from "@/components/ExportButton";
import {
  AlertCircle, CheckCircle, History, Home as HomeIcon,
  Settings, Sparkles, Zap, BarChart3, Clock, X, ChevronRight,
  Brain, Upload
} from "lucide-react";

const LIVE_AGENT_STEPS = [
  { label: "Data Custodian", desc: "Cleaning and validating data...", icon: "🔍" },
  { label: "Statistical Researcher", desc: "Identifying patterns and trends...", icon: "📊" },
  { label: "Business Reporter", desc: "Synthesizing actionable insights...", icon: "💡" },
];

const ANALYSIS_MODES = [
  { value: "quick", label: "Quick", icon: "⚡", time: "~15s", desc: "Brief summary", tokens: 1024, color: "emerald" },
  { value: "standard", label: "Standard", icon: "⚖️", time: "~45s", desc: "Balanced analysis", tokens: 2048, color: "blue" },
  { value: "deep", label: "Deep", icon: "🔬", time: "~90s", desc: "Full rich analysis", tokens: 4096, color: "purple" },
] as const;

interface AnalysisData {
  id: number;
  filename: string;
  summary: string;
  insights: string[];
  chart_data: Record<string, unknown>;
  forecast_data?: {
    available?: boolean; method?: string; date_column?: string;
    target_column?: string; horizon_days?: number;
    points?: Array<{ date: string; value: number }>; reason?: string;
  } | null;
  analysis_metadata?: {
    dataset_type?: string; date_column?: string | null;
    target_column?: string | null; category_column?: string | null;
    chart_title?: string; series_label?: string; rows?: number; columns?: number;
  } | null;
  agent_status?: string[];
  created_at: string;
}

interface BatchConnections {
  summary: string; shared_patterns: string[]; key_differences: string[];
  recommended_storyline: string; insight_connections: string[];
}

interface BatchAnalysisData {
  total_files: number; datasets: AnalysisData[];
  connections: BatchConnections;
  metadata: { file_count?: number; filenames?: string[]; dataset_types?: string[] };
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [batchAnalysisData, setBatchAnalysisData] = useState<BatchAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [historyData, setHistoryData] = useState<AnalysisData[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [selectedBedrockModel, setSelectedBedrockModel] = useState<string | undefined>(undefined);
  const [columnNames, setColumnNames] = useState<string[]>([]);
  const [analysisMode, setAnalysisMode] = useState<"quick" | "standard" | "deep">("standard");
  const analyzerRef = useRef<HTMLDivElement>(null);

  // Animate loading steps
  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    setLoadingStep(0);
    const interval = window.setInterval(() => {
      setLoadingStep((c) => Math.min(c + 1, LIVE_AGENT_STEPS.length - 1));
    }, 3000);
    return () => window.clearInterval(interval);
  }, [loading]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/history?limit=10`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setHistoryData(data.records || []);
      setShowHistory(true);
    } catch { setError("Could not load history"); }
  };

  const handleAnalyze = async (selectedFiles: File | File[]) => {
    const files = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
    const csvFiles = files.filter((f) => f.name.endsWith(".csv"));
    if (csvFiles.length === 0) { setError("Please upload at least one CSV file"); return; }

    setError(""); setLoading(true); setLoadingStep(0);
    setAnalysisData(null); setBatchAnalysisData(null);

    const formData = new FormData();
    const isBatch = csvFiles.length > 1;
    if (isBatch) csvFiles.forEach((f) => formData.append("files", f));
    else formData.append("file", csvFiles[0]);
    if (selectedBedrockModel) formData.append("model_id", selectedBedrockModel);
    formData.append("analysis_mode", analysisMode);

    try {
      const endpoint = isBatch ? `${API}/analyze/batch` : `${API}/analyze`;
      const res = await fetch(endpoint, { method: "POST", body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Analysis failed"); }
      const data = await res.json();

      if (isBatch) {
        setBatchAnalysisData(data as BatchAnalysisData);
      } else {
        const single = data as AnalysisData;
        setAnalysisData(single);
        try {
          const colRes = await fetch(`${API}/columns/${single.id}`);
          if (colRes.ok) { const cd = await colRes.json(); setColumnNames(cd.columns || []); }
        } catch { /* non-critical */ }
      }
      setError("");
      try {
        const hRes = await fetch(`${API}/history?limit=10`);
        if (hRes.ok) { const hd = await hRes.json(); setHistoryData(hd.records || []); }
      } catch { /* non-critical */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadFromHistory = async (id: number) => {
    try {
      const res = await fetch(`${API}/analysis/${id}`);
      if (!res.ok) throw new Error();
      setAnalysisData(await res.json());
      setShowHistory(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { setError("Could not load analysis record"); }
  };

  const handleGoHome = () => {
    setAnalysisData(null); setBatchAnalysisData(null);
    setError(""); setShowHistory(false); setShowAnalyzer(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openAnalyzer = () => {
    setShowAnalyzer(true);
    setTimeout(() => analyzerRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div className="w-full bg-[#020817]">
      {/* Hero */}
      <AnimatePresence>
        {!showAnalyzer && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <AuraHero onGetStarted={openAnalyzer} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyzer Section */}
      <AnimatePresence>
        {showAnalyzer && (
          <motion.div
            ref={analyzerRef}
            id="analyzer"
            className="min-h-screen w-full"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Top bar */}
            <div className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#020817]/90 backdrop-blur-xl">
              <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-white">AURA <span className="gradient-text-blue">Analyst</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { fetchHistory(); }}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white transition-all"
                  >
                    <History className="h-3.5 w-3.5" />
                    History
                    {historyData.length > 0 && (
                      <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-300">{historyData.length}</span>
                    )}
                  </button>
                  <a
                    href="/admin"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-500 hover:text-white transition-all"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={handleGoHome}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500 hover:text-white transition-all"
                  >
                    <HomeIcon className="h-3.5 w-3.5" />
                    Home
                  </button>
                </div>
              </div>
            </div>

            <div className="container mx-auto max-w-7xl px-4 py-8">
              {/* Page header */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Analyze Your <span className="gradient-text">Data</span>
                </h1>
                <p className="text-slate-400">Upload a CSV file and get AI-powered insights in seconds</p>
              </motion.div>

              <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
                {/* Left sidebar */}
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {/* Model selector */}
                  <div className="glass-card rounded-2xl border border-slate-700/50 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-semibold text-slate-200">AI Model</span>
                    </div>
                    <AIModelSelector
                      selectedModel={selectedBedrockModel}
                      onModelSelect={(m) => setSelectedBedrockModel(m)}
                      apiUrl={API}
                    />
                    <p className="mt-2 text-xs text-slate-500">Powered by AWS Bedrock</p>
                  </div>

                  {/* Analysis mode */}
                  <div className="glass-card rounded-2xl border border-slate-700/50 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-semibold text-slate-200">Analysis Mode</span>
                    </div>
                    <div className="space-y-2">
                      {ANALYSIS_MODES.map((mode) => (
                        <button
                          key={mode.value}
                          onClick={() => setAnalysisMode(mode.value)}
                          className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 ${
                            analysisMode === mode.value
                              ? mode.color === "emerald"
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                                : mode.color === "blue"
                                ? "border-blue-500/50 bg-blue-500/10 text-blue-200"
                                : "border-purple-500/50 bg-purple-500/10 text-purple-200"
                              : "border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                          }`}
                        >
                          <span className="text-xl">{mode.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">{mode.label}</span>
                              <span className={`text-xs font-bold ${
                                analysisMode === mode.value
                                  ? mode.color === "emerald" ? "text-emerald-400"
                                    : mode.color === "blue" ? "text-blue-400"
                                    : "text-purple-400"
                                  : "text-slate-600"
                              }`}>{mode.time}</span>
                            </div>
                            <div className="text-xs opacity-70 mt-0.5">{mode.desc}</div>
                          </div>
                          {analysisMode === mode.value && (
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              mode.color === "emerald" ? "bg-emerald-400"
                              : mode.color === "blue" ? "bg-blue-400"
                              : "bg-purple-400"
                            }`} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* File upload */}
                  <div className="glass-card rounded-2xl border border-slate-700/50 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm font-semibold text-slate-200">Upload CSV</span>
                    </div>
                    <FileUpload
                      onFileSelect={handleAnalyze}
                      disabled={loading}
                      isLoading={loading}
                    />
                  </div>

                  {/* Quick tips */}
                  {!analysisData && !loading && (
                    <div className="rounded-2xl border border-slate-700/30 bg-slate-800/20 p-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tips</p>
                      <ul className="space-y-2">
                        {[
                          "Use ⚡ Quick for fast summaries",
                          "Use 🔬 Deep for full analysis",
                          "Upload multiple CSVs for cross-file insights",
                          "Ask questions after analysis with NL Chat",
                        ].map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                            <ChevronRight className="w-3 h-3 mt-0.5 text-blue-500/50 flex-shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>

                {/* Main content area */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <AnimatePresence mode="wait">
                    {/* Loading state */}
                    {loading && (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-8"
                      >
                        <div className="flex flex-col items-center text-center mb-8">
                          {/* Animated logo */}
                          <div className="relative mb-6">
                            <motion.div
                              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-blue-500/30 flex items-center justify-center"
                              animate={{ rotate: [0, 5, -5, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <BarChart3 className="w-10 h-10 text-blue-400" />
                            </motion.div>
                            <motion.div
                              className="absolute inset-0 rounded-2xl border border-blue-400/30"
                              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">Analyzing your data...</h3>
                          <p className="text-slate-400 text-sm">
                            {ANALYSIS_MODES.find(m => m.value === analysisMode)?.icon}{" "}
                            {ANALYSIS_MODES.find(m => m.value === analysisMode)?.label} mode ·{" "}
                            {ANALYSIS_MODES.find(m => m.value === analysisMode)?.time}
                          </p>
                        </div>

                        {/* Agent steps */}
                        <div className="max-w-md mx-auto space-y-3">
                          {LIVE_AGENT_STEPS.map((step, i) => (
                            <motion.div
                              key={i}
                              className={`flex items-center gap-4 rounded-xl border p-4 transition-all duration-500 ${
                                i < loadingStep
                                  ? "border-emerald-500/30 bg-emerald-500/5"
                                  : i === loadingStep
                                  ? "border-blue-500/40 bg-blue-500/10"
                                  : "border-slate-700/30 bg-slate-800/20 opacity-40"
                              }`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: i <= loadingStep ? 1 : 0.4, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                                i < loadingStep ? "bg-emerald-500/20" : i === loadingStep ? "bg-blue-500/20" : "bg-slate-700/30"
                              }`}>
                                {i < loadingStep ? "✓" : step.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-white">{step.label}</div>
                                <div className="text-xs text-slate-400">{step.desc}</div>
                              </div>
                              {i === loadingStep && (
                                <motion.div
                                  className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                                />
                              )}
                              {i < loadingStep && (
                                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Error state */}
                    {error && !loading && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 flex items-start gap-4"
                      >
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-red-400 mb-1">Analysis Failed</h3>
                          <p className="text-sm text-slate-300">{error}</p>
                          <button
                            onClick={() => setError("")}
                            className="mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* Batch results */}
                    {batchAnalysisData && !loading && (
                      <motion.div
                        key="batch"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
                          <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                          <span className="text-sm text-cyan-300">
                            Multi-file analysis complete — {batchAnalysisData.total_files} CSV files analyzed
                          </span>
                        </div>

                        <div className="glass-card rounded-2xl border border-slate-700/50 p-6">
                          <h3 className="text-xl font-bold text-white mb-1">Cross-File AI Connections</h3>
                          <p className="text-sm text-slate-400 mb-5">How these datasets relate to each other</p>
                          <div className="space-y-4">
                            <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Executive Summary</p>
                              <p className="text-slate-200 text-sm leading-relaxed">{batchAnalysisData.connections.summary}</p>
                            </div>
                            {batchAnalysisData.connections.shared_patterns.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Shared Patterns</p>
                                <ul className="space-y-2">
                                  {batchAnalysisData.connections.shared_patterns.map((item) => (
                                    <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                                      <span className="text-blue-400 mt-0.5">•</span>{item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {batchAnalysisData.datasets.map((dataset) => (
                          <div key={dataset.id} className="glass-card rounded-2xl border border-slate-700/50 p-4">
                            <p className="text-sm font-semibold text-slate-300 mb-4">{dataset.filename}</p>
                            <AnalysisDashboard
                              summary={dataset.summary} insights={dataset.insights}
                              chartData={dataset.chart_data} forecastData={dataset.forecast_data}
                              analysisMetadata={dataset.analysis_metadata} filename={dataset.filename}
                            />
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {/* Single analysis results */}
                    {analysisData && !loading && !batchAnalysisData && (
                      <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-5"
                      >
                        {/* Success bar */}
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-emerald-300">Analysis Complete</p>
                              <p className="text-xs text-slate-500">{analysisData.filename}</p>
                            </div>
                          </div>
                          <ExportButton
                            targetId="analysis-dashboard-export"
                            filename={analysisData.filename}
                            insights={analysisData.insights}
                            chartData={analysisData.chart_data}
                          />
                        </div>

                        {/* Dashboard */}
                        <div id="analysis-dashboard-export" className="glass-card rounded-2xl border border-slate-700/50 overflow-hidden">
                          <AnalysisDashboard
                            summary={analysisData.summary} insights={analysisData.insights}
                            chartData={analysisData.chart_data} forecastData={analysisData.forecast_data}
                            analysisMetadata={analysisData.analysis_metadata} filename={analysisData.filename}
                          />
                        </div>

                        {/* NL Chat */}
                        <div className="glass-card rounded-2xl border border-slate-700/50 overflow-hidden">
                          <NLQueryChat analysisId={analysisData.id} filename={analysisData.filename} />
                        </div>

                        {/* Column analysis */}
                        <div className="glass-card rounded-2xl border border-slate-700/50 overflow-hidden">
                          <ColumnAnalysisPanel
                            analysisId={analysisData.id}
                            columns={columnNames.length > 0 ? columnNames : (() => {
                              const cols: string[] = [];
                              if (analysisData.analysis_metadata?.date_column) cols.push(analysisData.analysis_metadata.date_column);
                              if (analysisData.analysis_metadata?.target_column) cols.push(analysisData.analysis_metadata.target_column);
                              if (analysisData.analysis_metadata?.category_column) cols.push(analysisData.analysis_metadata.category_column);
                              return cols;
                            })()}
                          />
                        </div>

                        {/* Agent log */}
                        {(analysisData.agent_status?.length ?? 0) > 0 && (
                          <div className="rounded-2xl border border-slate-700/30 bg-slate-800/20 p-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Agent Log</p>
                            <div className="space-y-2">
                              {(analysisData.agent_status || []).map((msg) => (
                                <div key={msg} className="flex items-center gap-3 text-sm text-slate-400">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                  {msg}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Empty state */}
                    {!loading && !error && !analysisData && !batchAnalysisData && (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700/50 py-24 text-center"
                      >
                        <motion.div
                          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/20 flex items-center justify-center mb-6"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <BarChart3 className="w-10 h-10 text-blue-400/60" />
                        </motion.div>
                        <h3 className="text-xl font-semibold text-slate-300 mb-2">Ready to analyze</h3>
                        <p className="text-slate-500 text-sm max-w-xs">
                          Upload a CSV file on the left to get started. Choose your analysis mode for the right speed/depth balance.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowHistory(false)}
            />
            <motion.div
              className="relative max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <History className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Analysis History</h3>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {historyData.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No analysis history yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historyData.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleLoadFromHistory(item.id)}
                      className="w-full rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 text-left transition-all hover:border-blue-500/40 hover:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{item.filename}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
                          </div>
                          <p className="mt-1.5 text-xs text-slate-400 line-clamp-1">{item.summary}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating CTA when hero is visible */}
      {!showAnalyzer && (
        <motion.button
          onClick={openAnalyzer}
          className="fixed bottom-8 right-8 z-40 glow-button"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, type: "spring" }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4" />
            Start Analyzing
          </span>
        </motion.button>
      )}
    </div>
  );
}
