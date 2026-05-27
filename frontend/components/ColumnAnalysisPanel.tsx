"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Columns, ChevronDown, Loader2, TrendingUp, Hash, AlertTriangle, CheckCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ColumnData {
  column: string;
  dtype: string;
  total_values: number;
  missing: number;
  missing_pct: number;
  unique: number;
  // numeric
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  q25?: number;
  q75?: number;
  outliers?: number;
  histogram?: { range: string; count: number }[];
  // categorical
  top_values?: { value: string; count: number }[];
  bar_data?: { name: string; value: number }[];
}

interface ColumnAnalysisPanelProps {
  analysisId: number;
  columns: string[];
}

const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1"];

export default function ColumnAnalysisPanel({ analysisId, columns }: ColumnAnalysisPanelProps) {
  const [selected, setSelected] = useState<string>("");
  const [data, setData] = useState<ColumnData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchColumn = async (col: string) => {
    if (!col) return;
    setSelected(col);
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`${API}/column/${analysisId}/${encodeURIComponent(col)}`);
      if (!res.ok) throw new Error((await res.json()).detail || "Failed");
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || "Error fetching column data");
    } finally {
      setLoading(false);
    }
  };

  const isNumeric = data && data.histogram !== undefined;

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700/50 bg-slate-800/60">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
          <Columns className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">Column Deep-Dive</h3>
          <p className="text-xs text-slate-400">Click any column for detailed statistics</p>
        </div>
      </div>

      <div className="p-5">
        {/* Column selector */}
        <div className="relative mb-5">
          <select
            value={selected}
            onChange={(e) => fetchColumn(e.target.value)}
            className="w-full appearance-none bg-slate-800 border border-slate-600/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 pr-10"
          >
            <option value="">— Select a column —</option>
            {columns.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Quick column chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          {columns.slice(0, 8).map((c) => (
            <button
              key={c}
              onClick={() => fetchColumn(c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selected === c
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-800 border-slate-600/50 text-slate-300 hover:border-blue-500/50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            <span className="ml-2 text-slate-400 text-sm">Loading column stats...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-400/10 rounded-xl p-3 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {/* Overview stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total", value: data.total_values.toLocaleString(), icon: Hash, color: "text-blue-400" },
                { label: "Unique", value: data.unique.toLocaleString(), icon: TrendingUp, color: "text-violet-400" },
                { label: "Missing", value: `${data.missing_pct}%`, icon: AlertTriangle, color: data.missing_pct > 5 ? "text-amber-400" : "text-emerald-400" },
                { label: "Type", value: data.dtype, icon: CheckCircle, color: "text-cyan-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                  <div className={`flex items-center gap-1.5 text-xs mb-1 ${color}`}>
                    <Icon className="w-3 h-3" />
                    {label}
                  </div>
                  <div className="text-white font-semibold text-sm truncate">{value}</div>
                </div>
              ))}
            </div>

            {/* Numeric stats */}
            {isNumeric && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Min", value: data.min },
                    { label: "Mean", value: data.mean },
                    { label: "Max", value: data.max },
                    { label: "Median", value: data.median },
                    { label: "Std Dev", value: data.std },
                    { label: "Outliers", value: data.outliers },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/30">
                      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                      <div className="text-sm font-medium text-slate-200">
                        {typeof value === "number" ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Histogram */}
                {data.histogram && data.histogram.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Distribution</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={data.histogram} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                        <XAxis dataKey="range" tick={{ fontSize: 9, fill: "#64748b" }} interval={1} />
                        <YAxis tick={{ fontSize: 9, fill: "#64748b" }} />
                        <Tooltip
                          contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: "#94a3b8" }}
                          itemStyle={{ color: "#60a5fa" }}
                        />
                        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                          {data.histogram.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}

            {/* Categorical stats */}
            {!isNumeric && data.bar_data && data.bar_data.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Top Values</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data.bar_data} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} width={80} />
                    <Tooltip
                      contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: "#60a5fa" }}
                    />
                    <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                      {data.bar_data.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {!data && !loading && !error && (
          <div className="text-center py-10 text-slate-500">
            <Columns className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a column above to see detailed statistics</p>
          </div>
        )}
      </div>
    </div>
  );
}
