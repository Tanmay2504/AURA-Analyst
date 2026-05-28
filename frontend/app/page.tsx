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
import { AlertCircle, CheckCircle, History, X, ChevronRight, Clock } from "lucide-react";

/* ── Types ───────────────────────────────────────────────────────────────── */
interface AnalysisData {
  id: number; filename: string; summary: string; insights: string[];
  chart_data: Record<string, unknown>;
  forecast_data?: { available?: boolean; method?: string; date_column?: string; target_column?: string; horizon_days?: number; points?: Array<{ date: string; value: number }>; reason?: string } | null;
  analysis_metadata?: { dataset_type?: string; date_column?: string | null; target_column?: string | null; category_column?: string | null; chart_title?: string; series_label?: string; rows?: number; columns?: number } | null;
  agent_status?: string[]; created_at: string;
}
interface BatchConnections { summary: string; shared_patterns: string[]; key_differences: string[]; recommended_storyline: string; insight_connections: string[]; }
interface BatchAnalysisData { total_files: number; datasets: AnalysisData[]; connections: BatchConnections; metadata: { file_count?: number; filenames?: string[] }; }

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MODES = [
  { value: "quick", icon: "⚡", label: "QUICK", time: "~15s", flag: "--mode quick", desc: "Brief summary · 1024 tokens" },
  { value: "standard", icon: "⚖", label: "STANDARD", time: "~45s", flag: "--mode standard", desc: "Balanced · 2048 tokens" },
  { value: "deep", icon: "🔬", label: "DEEP", time: "~90s", flag: "--mode deep", desc: "Full analysis · 4096 tokens" },
] as const;

const AGENT_STEPS = [
  { label: "data_custodian", desc: "Cleaning & validating dataset..." },
  { label: "statistical_researcher", desc: "Detecting patterns & anomalies..." },
  { label: "business_reporter", desc: "Synthesizing actionable insights..." },
];

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function Home() {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [batchData, setBatchData] = useState<BatchAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [historyData, setHistoryData] = useState<AnalysisData[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [model, setModel] = useState<string | undefined>(undefined);
  const [columns, setColumns] = useState<string[]>([]);
  const [mode, setMode] = useState<"quick" | "standard" | "deep">("standard");
  const analyzerRef = useRef<HTMLDivElement>(null);

  // Session ID — stored in localStorage so each browser has its own history
  const getSessionId = (): string => {
    if (typeof window === "undefined") return "";
    let sid = localStorage.getItem("aura_session_id");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("aura_session_id", sid);
    }
    return sid;
  };

  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    setLoadingStep(0);
    const iv = window.setInterval(() => setLoadingStep(c => Math.min(c + 1, AGENT_STEPS.length - 1)), 3000);
    return () => window.clearInterval(iv);
  }, [loading]);

  const fetchHistory = async () => {
    try {
      const sid = getSessionId();
      const r = await fetch(`${API}/history?limit=10&session_id=${encodeURIComponent(sid)}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      setHistoryData(d.records || []);
      setShowHistory(true);
    } catch { setError("Could not load history"); }
  };

  const handleAnalyze = async (sel: File | File[]) => {
    const files = (Array.isArray(sel) ? sel : [sel]).filter(f => f.name.endsWith(".csv"));
    if (!files.length) { setError("Please upload at least one CSV file"); return; }
    setError(""); setLoading(true); setLoadingStep(0);
    setAnalysisData(null); setBatchData(null);
    const fd = new FormData();
    const batch = files.length > 1;
    if (batch) files.forEach(f => fd.append("files", f)); else fd.append("file", files[0]);
    if (model) fd.append("model_id", model);
    fd.append("analysis_mode", mode);
    if (!batch) fd.append("session_id", getSessionId());
    try {
      const res = await fetch(`${API}/${batch ? "analyze/batch" : "analyze"}`, { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Analysis failed"); }
      const data = await res.json();
      if (batch) {
        setBatchData(data as BatchAnalysisData);
      } else {
        const single = data as AnalysisData;
        setAnalysisData(single);
        try { const cr = await fetch(`${API}/columns/${single.id}`); if (cr.ok) { const cd = await cr.json(); setColumns(cd.columns || []); } } catch { /* ok */ }
      }
      try { const hr = await fetch(`${API}/history?limit=10`); if (hr.ok) { const hd = await hr.json(); setHistoryData(hd.records || []); } } catch { /* ok */ }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally { setLoading(false); }
  };

  const loadHistory = async (id: number) => {
    try {
      const r = await fetch(`${API}/analysis/${id}`);
      if (!r.ok) throw new Error();
      setAnalysisData(await r.json());
      setShowHistory(false);
    } catch { setError("Could not load record"); }
  };

  const goHome = () => { setAnalysisData(null); setBatchData(null); setError(""); setShowHistory(false); setShowAnalyzer(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openAnalyzer = () => { setShowAnalyzer(true); };

  return (
    <div className="w-full bg-[#0a0a08]">
      {/* Hero */}
      <AnimatePresence>
        {!showAnalyzer && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <AuraHero onGetStarted={openAnalyzer} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analyzer */}
      <AnimatePresence>
        {showAnalyzer && (
          <motion.div ref={analyzerRef} id="analyzer" className="min-h-screen"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>

            {/* Top bar */}
            <div className="sticky top-0 z-30 border-b border-[#2a2a1e] bg-[#0a0a08]/95 backdrop-blur-sm">
              <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 border border-[#f97316]/50 flex items-center justify-center">
                    <span className="font-mono text-[10px] font-bold text-[#f97316]">AU</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#f97316]">AURA</span>
                  <span className="font-mono text-xs text-[#3d3a2e]">// analyzer</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={fetchHistory}
                    className="font-mono text-xs border border-[#2a2a1e] px-3 py-1.5 text-[#7a7060] hover:border-[#f97316]/40 hover:text-[#f97316] transition-all flex items-center gap-2">
                    <History className="w-3 h-3" /> history
                    {historyData.length > 0 && <span className="text-[#f97316]">[{historyData.length}]</span>}
                  </button>
                  <a href="/admin"
                    className="font-mono text-xs border border-[#2a2a1e] px-3 py-1.5 text-[#7a7060] hover:border-[#f97316]/40 hover:text-[#f97316] transition-all">
                    admin
                  </a>
                  <button onClick={goHome}
                    className="font-mono text-xs border border-[#2a2a1e] px-3 py-1.5 text-[#7a7060] hover:border-[#f97316]/40 hover:text-[#f97316] transition-all">
                    ~/home
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
              {/* Page title */}
              <motion.div className="mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="font-mono text-xs text-[#7a7060] mb-1">
                  <span className="text-[#f97316]">$</span> aura analyze --interactive
                </div>
                <h1 className="font-mono text-2xl md:text-3xl font-bold text-[#e8e0cc]">
                  ANALYSIS_SESSION<span className="text-[#f97316] blink">_</span>
                </h1>
              </motion.div>

              <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
                {/* ── Sidebar ── */}
                <motion.div className="space-y-3" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>

                  {/* Model */}
                  <div className="term-card">
                    <div className="term-header">
                      <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                      <span className="ml-1">model_selector</span>
                    </div>
                    <div className="p-4">
                      <AIModelSelector selectedModel={model} onModelSelect={setModel} apiUrl={API} />
                      <div className="mt-2 font-mono text-[10px] text-[#3d3a2e]">// AWS Bedrock runtime</div>
                    </div>
                  </div>

                  {/* Mode */}
                  <div className="term-card">
                    <div className="term-header">
                      <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                      <span className="ml-1">analysis_mode</span>
                    </div>
                    <div className="p-4 space-y-2">
                      {MODES.map(m => (
                        <button key={m.value} onClick={() => setMode(m.value)}
                          className={`w-full flex items-center gap-3 border p-3 text-left transition-all duration-150 ${mode === m.value
                            ? "border-[#f97316]/60 bg-[#f97316]/5 text-[#f97316]"
                            : "border-[#2a2a1e] text-[#7a7060] hover:border-[#f97316]/30 hover:text-[#e8e0cc]"
                            }`}>
                          <span className="text-base w-6 text-center">{m.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold">{m.label}</span>
                              <span className={`font-mono text-[10px] ${mode === m.value ? "text-[#f97316]" : "text-[#3d3a2e]"}`}>{m.time}</span>
                            </div>
                            <div className="font-mono text-[10px] opacity-60 mt-0.5">{m.flag}</div>
                          </div>
                          {mode === m.value && <span className="w-1.5 h-1.5 bg-[#f97316] flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upload */}
                  <div className="term-card">
                    <div className="term-header">
                      <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                      <span className="ml-1">file_input</span>
                    </div>
                    <div className="p-4">
                      <FileUpload onFileSelect={handleAnalyze} disabled={loading} isLoading={loading} />
                    </div>
                  </div>

                  {/* Tips */}
                  {!analysisData && !loading && (
                    <div className="border border-[#2a2a1e] p-4">
                      <div className="font-mono text-[10px] text-[#3d3a2e] uppercase tracking-widest mb-3">// usage notes</div>
                      <ul className="space-y-2">
                        {[
                          "⚡ quick  → fast summary, minimal tokens",
                          "🔬 deep   → full analysis, all sections",
                          "multi-csv → cross-file comparison mode",
                          "nl_query  → ask questions post-analysis",
                        ].map((t, i) => (
                          <li key={i} className="font-mono text-[10px] text-[#3d3a2e] flex items-start gap-2">
                            <span className="text-[#f97316]/40 mt-0.5">›</span>{t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>

                {/* ── Main panel ── */}
                <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                  <AnimatePresence mode="wait">

                    {/* Loading */}
                    {loading && (
                      <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="term-card scanlines">
                        <div className="term-header">
                          <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                          <span className="ml-1">aura — analyzing...</span>
                          <span className="ml-auto font-mono text-[10px] text-[#f97316]">
                            {MODES.find(m => m.value === mode)?.time}
                          </span>
                        </div>
                        <div className="p-8 relative z-10">
                          <div className="font-mono text-xs text-[#7a7060] mb-6">
                            <span className="text-[#f97316]">$</span> aura analyze {MODES.find(m => m.value === mode)?.flag}
                          </div>
                          <div className="space-y-3 max-w-lg">
                            {AGENT_STEPS.map((step, i) => (
                              <motion.div key={i}
                                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                className={`flex items-center gap-4 border p-3 transition-all duration-500 ${i < loadingStep ? "border-[#4ade80]/30 bg-[#4ade80]/5" :
                                  i === loadingStep ? "border-[#f97316]/40 bg-[#f97316]/5" :
                                    "border-[#2a2a1e] opacity-30"
                                  }`}>
                                <div className="font-mono text-xs w-6 text-center">
                                  {i < loadingStep ? <span className="text-[#4ade80]">✓</span> :
                                    i === loadingStep ? <motion.span className="text-[#f97316]" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>█</motion.span> :
                                      <span className="text-[#3d3a2e]">○</span>}
                                </div>
                                <div className="flex-1">
                                  <div className={`font-mono text-xs font-bold ${i <= loadingStep ? "text-[#e8e0cc]" : "text-[#3d3a2e]"}`}>
                                    {step.label}
                                  </div>
                                  <div className="font-mono text-[10px] text-[#7a7060]">{step.desc}</div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                          <div className="mt-6 font-mono text-xs text-[#f97316]">
                            {">"} <span className="blink">█</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Error */}
                    {error && !loading && (
                      <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="term-card border-[#f87171]/30">
                        <div className="term-header border-[#f87171]/20">
                          <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                          <span className="ml-1 text-[#f87171]">error — analysis failed</span>
                        </div>
                        <div className="p-5 flex items-start gap-4 relative z-10">
                          <AlertCircle className="w-4 h-4 text-[#f87171] flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="font-mono text-xs text-[#f87171] mb-1">ANALYSIS_ERROR</div>
                            <div className="text-sm text-[#e8e0cc]">{error}</div>
                            <button onClick={() => setError("")} className="mt-3 font-mono text-[10px] text-[#3d3a2e] hover:text-[#f97316] transition-colors">
                              [dismiss]
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Batch results */}
                    {batchData && !loading && (
                      <motion.div key="batch" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="term-card">
                          <div className="term-header">
                            <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                            <span className="ml-1 text-[#4ade80]">batch_complete — {batchData.total_files} files</span>
                          </div>
                          <div className="p-5 relative z-10">
                            <div className="font-mono text-[10px] text-[#f97316] mb-2">── CROSS-FILE CONNECTIONS ──</div>
                            <p className="text-sm text-[#e8e0cc] leading-relaxed mb-4">{batchData.connections.summary}</p>
                            {batchData.connections.shared_patterns.length > 0 && (
                              <ul className="space-y-1">
                                {batchData.connections.shared_patterns.map(p => (
                                  <li key={p} className="font-mono text-xs text-[#7a7060] flex gap-2">
                                    <span className="text-[#f97316]">›</span>{p}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                        {batchData.datasets.map(ds => (
                          <div key={ds.id} className="term-card">
                            <div className="term-header">
                              <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                              <span className="ml-1">{ds.filename}</span>
                            </div>
                            <div className="p-4 relative z-10">
                              <AnalysisDashboard summary={ds.summary} insights={ds.insights} chartData={ds.chart_data}
                                forecastData={ds.forecast_data} analysisMetadata={ds.analysis_metadata} filename={ds.filename} />
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {/* Single results */}
                    {analysisData && !loading && !batchData && (
                      <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {/* Status bar */}
                        <div className="term-card border-[#4ade80]/20">
                          <div className="p-3 flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                              <CheckCircle className="w-4 h-4 text-[#4ade80]" />
                              <div>
                                <div className="font-mono text-xs font-bold text-[#4ade80]">ANALYSIS_COMPLETE</div>
                                <div className="font-mono text-[10px] text-[#3d3a2e]">{analysisData.filename}</div>
                              </div>
                            </div>
                            <ExportButton
                              filename={analysisData.filename}
                              insights={analysisData.insights}
                              summary={analysisData.summary}
                              chartData={analysisData.chart_data}
                              forecastData={analysisData.forecast_data}
                              analysisMetadata={analysisData.analysis_metadata}
                            />
                          </div>
                        </div>

                        {/* Dashboard */}
                        <div id="aura-export" className="term-card">
                          <div className="term-header">
                            <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                            <span className="ml-1">analysis_dashboard — {analysisData.filename}</span>
                          </div>
                          <div className="p-4 relative z-10">
                            <AnalysisDashboard summary={analysisData.summary} insights={analysisData.insights}
                              chartData={analysisData.chart_data} forecastData={analysisData.forecast_data}
                              analysisMetadata={analysisData.analysis_metadata} filename={analysisData.filename} />
                          </div>
                        </div>

                        {/* NL Query */}
                        <div className="term-card">
                          <div className="term-header">
                            <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                            <span className="ml-1">nl_query — ask anything</span>
                          </div>
                          <div className="p-4 relative z-10">
                            <NLQueryChat analysisId={analysisData.id} filename={analysisData.filename} />
                          </div>
                        </div>

                        {/* Column analysis */}
                        <div className="term-card">
                          <div className="term-header">
                            <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                            <span className="ml-1">column_analysis</span>
                          </div>
                          <div className="p-4 relative z-10">
                            <ColumnAnalysisPanel analysisId={analysisData.id}
                              columns={columns.length > 0 ? columns : (() => {
                                const c: string[] = [];
                                if (analysisData.analysis_metadata?.date_column) c.push(analysisData.analysis_metadata.date_column);
                                if (analysisData.analysis_metadata?.target_column) c.push(analysisData.analysis_metadata.target_column);
                                if (analysisData.analysis_metadata?.category_column) c.push(analysisData.analysis_metadata.category_column);
                                return c;
                              })()} />
                          </div>
                        </div>

                        {/* Agent log */}
                        {(analysisData.agent_status?.length ?? 0) > 0 && (
                          <div className="term-card">
                            <div className="term-header">
                              <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                              <span className="ml-1">agent_log</span>
                            </div>
                            <div className="p-4 space-y-1.5 relative z-10">
                              {(analysisData.agent_status || []).map(msg => (
                                <div key={msg} className="font-mono text-xs text-[#7a7060] flex gap-2">
                                  <span className="text-[#4ade80]">✓</span>{msg}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* Empty */}
                    {!loading && !error && !analysisData && !batchData && (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="term-card scanlines min-h-[400px] flex flex-col items-center justify-center text-center">
                        <div className="relative z-10">
                          <motion.div className="font-mono text-6xl text-[#2a2a1e] mb-6 select-none"
                            animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity }}>
                            ▓▒░
                          </motion.div>
                          <div className="font-mono text-sm font-bold text-[#e8e0cc] mb-2">AWAITING_INPUT</div>
                          <div className="font-mono text-xs text-[#3d3a2e] mb-6">
                            Upload a CSV file to initialize analysis session
                          </div>
                          <div className="font-mono text-xs text-[#f97316]">
                            {">"} <span className="blink">█</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
            <motion.div className="relative max-h-[80vh] w-full max-w-xl overflow-y-auto term-card shadow-2xl"
              initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}>
              <div className="term-header sticky top-0">
                <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                <span className="ml-1 flex-1">analysis_history</span>
                <button onClick={() => setShowHistory(false)} className="text-[#7a7060] hover:text-[#f97316] transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-4 relative z-10">
                {historyData.length === 0 ? (
                  <div className="text-center py-12 font-mono text-xs text-[#3d3a2e]">// no records found</div>
                ) : (
                  <div className="space-y-2">
                    {historyData.map(item => (
                      <button key={item.id} onClick={() => loadHistory(item.id)}
                        className="w-full border border-[#2a2a1e] p-3 text-left hover:border-[#f97316]/40 hover:bg-[#f97316]/5 transition-all">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs font-bold text-[#e8e0cc] truncate">{item.filename}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-[#3d3a2e]" />
                              <span className="font-mono text-[10px] text-[#3d3a2e]">{new Date(item.created_at).toLocaleString()}</span>
                            </div>
                            <div className="font-mono text-[10px] text-[#7a7060] mt-1 truncate">{item.summary}</div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-[#f97316] flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating launch button on hero */}
      {!showAnalyzer && (
        <motion.button onClick={openAnalyzer}
          className="fixed bottom-8 right-8 z-40 btn-amber"
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2, type: "spring" }}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <span>$ ./analyze</span>
        </motion.button>
      )}
    </div>
  );
}
