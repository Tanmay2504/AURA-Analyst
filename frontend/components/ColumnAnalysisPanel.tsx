"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChevronDown } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ColumnData {
  column: string;
  dtype: string;
  total_values: number;
  missing: number;
  missing_pct: number;
  unique: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  q25?: number;
  q75?: number;
  outliers?: number;
  histogram?: { range: string; count: number }[];
  top_values?: { value: string; count: number }[];
  bar_data?: { name: string; value: number }[];
}

interface ColumnAnalysisPanelProps {
  analysisId: number;
  columns: string[];
}

const fmt = (n?: number) => n == null ? "—" : Number.isInteger(n) ? n.toLocaleString() : n.toFixed(4);

export default function ColumnAnalysisPanel({ analysisId, columns }: ColumnAnalysisPanelProps) {
  const [selected, setSelected] = useState<string>("");
  const [data, setData] = useState<ColumnData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const fetchColumn = async (col: string) => {
    if (!col) return;
    setSelected(col);
    setOpen(false);
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

  const isNumeric = data && data.min !== undefined;
  const chartData = isNumeric
    ? (data.histogram || []).map((b) => ({ name: b.range, value: b.count }))
    : (data?.bar_data || data?.top_values?.map((v) => ({ name: v.value, value: v.count })) || []);

  if (!columns || columns.length === 0) {
    return (
      <div className="font-mono text-xs text-[#3d3a2e] py-4 text-center">
        // no columns available for deep-dive analysis
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Column selector */}
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between border border-[#2a2a1e] px-3 py-2.5 hover:border-[#f97316]/40 transition-all"
        >
          <div>
            <div className="font-mono text-[10px] text-[#3d3a2e] mb-0.5">// select_column</div>
            <div className="font-mono text-xs text-[#e8e0cc]">
              {selected || "choose a column to analyze"}
            </div>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-[#f97316] transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 z-50 border border-[#f97316]/30 bg-[#0f0f0b] max-h-48 overflow-y-auto shadow-xl">
            {columns.map((col) => (
              <button
                key={col}
                onClick={() => fetchColumn(col)}
                className={`w-full px-3 py-2 text-left border-b border-[#2a2a1e] last:border-0 hover:bg-[#f97316]/5 transition-all
                  ${selected === col ? "bg-[#f97316]/5 border-l-2 border-l-[#f97316]" : ""}`}
              >
                <span className="font-mono text-xs text-[#e8e0cc]">{col}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="border border-[#2a2a1e] p-4 text-center">
          <span className="font-mono text-xs text-[#f97316]">loading_column_data<span className="blink">█</span></span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border border-[#f87171]/30 bg-[#f87171]/5 p-3">
          <span className="font-mono text-xs text-[#f87171]">error: {error}</span>
        </div>
      )}

      {/* Column stats */}
      {data && !loading && (
        <div className="space-y-3">
          {/* Header stats */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="border border-[#2a2a1e] p-2 text-center">
              <div className="font-mono text-[9px] text-[#3d3a2e] uppercase">dtype</div>
              <div className="font-mono text-xs font-bold text-[#f97316]">{data.dtype}</div>
            </div>
            <div className="border border-[#2a2a1e] p-2 text-center">
              <div className="font-mono text-[9px] text-[#3d3a2e] uppercase">total</div>
              <div className="font-mono text-xs font-bold text-[#e8e0cc]">{data.total_values.toLocaleString()}</div>
            </div>
            <div className={`border p-2 text-center ${data.missing > 0 ? "border-[#f87171]/30 bg-[#f87171]/5" : "border-[#2a2a1e]"}`}>
              <div className="font-mono text-[9px] text-[#3d3a2e] uppercase">missing</div>
              <div className={`font-mono text-xs font-bold ${data.missing > 0 ? "text-[#f87171]" : "text-[#4ade80]"}`}>
                {data.missing} ({data.missing_pct}%)
              </div>
            </div>
            <div className="border border-[#2a2a1e] p-2 text-center">
              <div className="font-mono text-[9px] text-[#3d3a2e] uppercase">unique</div>
              <div className="font-mono text-xs font-bold text-[#e8e0cc]">{data.unique.toLocaleString()}</div>
            </div>
          </div>

          {/* Numeric stats */}
          {isNumeric && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {[
                { k: "min", v: fmt(data.min) },
                { k: "max", v: fmt(data.max) },
                { k: "mean", v: fmt(data.mean) },
                { k: "median", v: fmt(data.median) },
                { k: "std_dev", v: fmt(data.std) },
                { k: "q25", v: fmt(data.q25) },
                { k: "q75", v: fmt(data.q75) },
                { k: "outliers", v: String(data.outliers ?? 0) },
              ].map(({ k, v }) => (
                <div key={k} className="border border-[#2a2a1e] p-2 text-center">
                  <div className="font-mono text-[9px] text-[#3d3a2e] uppercase">{k}</div>
                  <div className="font-mono text-xs font-bold text-[#f97316]">{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div>
              <div className="font-mono text-[10px] text-[#3d3a2e] uppercase tracking-widest mb-2">
                // {isNumeric ? "distribution_histogram" : "top_values"}
              </div>
              <div className="h-48 border border-[#2a2a1e] bg-[#0a0a08] p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
                    <XAxis dataKey="name" tick={{ fill: "#7a7060", fontSize: 9, fontFamily: "JetBrains Mono" }}
                      angle={-30} textAnchor="end" height={40} />
                    <YAxis tick={{ fill: "#7a7060", fontSize: 9, fontFamily: "JetBrains Mono" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f0f0b", border: "1px solid #f97316", borderRadius: 0, color: "#e8e0cc", fontFamily: "JetBrains Mono", fontSize: 10 }}
                      cursor={{ fill: "rgba(249,115,22,0.05)" }}
                    />
                    <Bar dataKey="value" fill="#f97316" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top values table (categorical) */}
          {!isNumeric && data.top_values && data.top_values.length > 0 && (
            <div>
              <div className="font-mono text-[10px] text-[#3d3a2e] uppercase tracking-widest mb-2">// top_values</div>
              <div className="space-y-1">
                {data.top_values.slice(0, 8).map((v, i) => (
                  <div key={i} className="flex items-center gap-3 border border-[#2a2a1e] px-3 py-1.5">
                    <span className="font-mono text-[10px] text-[#3d3a2e] w-4 text-center">{i + 1}</span>
                    <span className="flex-1 font-mono text-xs text-[#e8e0cc] truncate">{v.value}</span>
                    <span className="font-mono text-xs font-bold text-[#f97316]">{v.count.toLocaleString()}</span>
                    <div className="w-16 bg-[#2a2a1e] h-1">
                      <div className="h-1 bg-[#f97316]"
                        style={{ width: `${Math.round((v.count / (data.top_values![0]?.count || 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="border border-dashed border-[#2a2a1e] p-6 text-center">
          <div className="font-mono text-xs text-[#3d3a2e]">// select a column above to view deep-dive statistics</div>
        </div>
      )}
    </div>
  );
}
