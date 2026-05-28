"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet, FileJson, Loader2, ChevronDown } from "lucide-react";

interface ExportButtonProps {
  targetId?: string;
  filename?: string;
  insights?: any[];
  summary?: string;
  chartData?: any;
  forecastData?: any;
  analysisMetadata?: any;
}

export default function ExportButton({
  filename = "analysis",
  insights = [],
  summary = "",
  chartData,
  forecastData,
  analysisMetadata,
}: ExportButtonProps) {
  const [loading, setLoading] = useState<"pdf" | "csv" | "json" | null>(null);
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const openDropdown = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + window.scrollY + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((v) => !v);
  };

  // Close on scroll/resize
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const baseName = filename.replace(/\.csv$/i, "");

  /* ── helpers ── */
  const downloadText = (content: string, name: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const insightText = (ins: any): string =>
    typeof ins === "string" ? ins : ins?.insight || ins?.title || JSON.stringify(ins);

  /* ── PDF: fully text-based structured report ── */
  const exportPDF = async () => {
    setLoading("pdf");
    setOpen(false);
    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const contentW = pageW - margin * 2;
      let y = 0;

      const addPage = () => {
        pdf.addPage();
        y = margin;
        // subtle footer on each page
        pdf.setFontSize(7);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`AURA Analyst Report  ·  ${baseName}  ·  ${new Date().toLocaleDateString()}`, margin, pageH - 6);
      };

      const checkY = (needed: number) => {
        if (y + needed > pageH - 14) addPage();
      };

      const sectionTitle = (title: string) => {
        checkY(12);
        pdf.setFillColor(30, 41, 59);
        pdf.rect(margin, y, contentW, 8, "F");
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(148, 210, 255);
        pdf.text(title.toUpperCase(), margin + 3, y + 5.5);
        y += 11;
      };

      const bodyText = (text: string, color: [number, number, number] = [220, 220, 220], size = 9) => {
        pdf.setFontSize(size);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...color);
        const lines = pdf.splitTextToSize(text, contentW - 4);
        checkY(lines.length * 5 + 2);
        pdf.text(lines, margin + 2, y);
        y += lines.length * 5 + 2;
      };

      const labelValue = (label: string, value: string) => {
        checkY(7);
        pdf.setFontSize(8.5);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(148, 210, 255);
        pdf.text(`${label}:`, margin + 2, y);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(220, 220, 220);
        const valLines = pdf.splitTextToSize(value, contentW - 40);
        pdf.text(valLines, margin + 38, y);
        y += Math.max(valLines.length * 5, 6) + 1;
      };

      /* ── Cover / Header ── */
      pdf.setFillColor(10, 10, 8);
      pdf.rect(0, 0, pageW, pageH, "F");

      // Orange accent bar
      pdf.setFillColor(249, 115, 22);
      pdf.rect(0, 0, pageW, 2, "F");

      y = 18;
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(249, 115, 22);
      pdf.text("AURA ANALYST", margin, y);
      y += 8;
      pdf.setFontSize(13);
      pdf.setTextColor(232, 224, 204);
      pdf.text("Data Analysis Report", margin, y);
      y += 6;
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
      y += 4;
      pdf.text(`Source file: ${filename}`, margin, y);
      y += 12;

      // Divider
      pdf.setDrawColor(42, 42, 30);
      pdf.line(margin, y, pageW - margin, y);
      y += 8;

      /* ── Dataset Metadata ── */
      if (analysisMetadata) {
        sectionTitle("Dataset Overview");
        if (analysisMetadata.rows) labelValue("Rows", String(analysisMetadata.rows));
        if (analysisMetadata.columns) labelValue("Columns", String(analysisMetadata.columns));
        if (analysisMetadata.dataset_type) labelValue("Dataset Type", analysisMetadata.dataset_type);
        if (analysisMetadata.target_column) labelValue("Target Column", analysisMetadata.target_column);
        if (analysisMetadata.date_column) labelValue("Date Column", analysisMetadata.date_column);
        if (analysisMetadata.category_column) labelValue("Category Column", analysisMetadata.category_column);
        if (analysisMetadata.series_label) labelValue("Series Label", analysisMetadata.series_label);
        if (analysisMetadata.model_used) labelValue("AI Model", analysisMetadata.model_used);
        y += 4;
      }

      /* ── Executive Summary ── */
      if (summary) {
        sectionTitle("Executive Summary");
        // Strip JSON if summary is a JSON blob
        let displaySummary = summary.trim();
        if (displaySummary.startsWith("{") || displaySummary.startsWith("[")) {
          try {
            const parsed = JSON.parse(displaySummary);
            displaySummary =
              parsed?.dataset_overview?.summary ||
              parsed?.summary ||
              parsed?.analysis_report?.dataset_overview?.summary ||
              "See full analysis below.";
          } catch {
            displaySummary = "See full analysis below.";
          }
        }
        bodyText(displaySummary);
        y += 4;
      }

      /* ── Key Insights ── */
      if (insights.length > 0) {
        sectionTitle(`Key Insights  (${insights.length})`);
        insights.forEach((ins, i) => {
          const text = insightText(ins);
          checkY(8);
          // bullet
          pdf.setFillColor(249, 115, 22);
          pdf.circle(margin + 3, y - 1, 1.2, "F");
          pdf.setFontSize(8.5);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(220, 220, 220);
          const lines = pdf.splitTextToSize(`${text}`, contentW - 10);
          pdf.text(lines, margin + 7, y);
          y += lines.length * 5 + 2;
        });
        y += 4;
      }

      /* ── Chart Data Table ── */
      if (chartData?.labels?.length > 0 && chartData?.values?.length > 0) {
        sectionTitle(`Chart Data  —  ${analysisMetadata?.chart_title || "Data Visualization"}`);
        const colW = [contentW * 0.55, contentW * 0.45];

        // Table header
        checkY(8);
        pdf.setFillColor(30, 41, 59);
        pdf.rect(margin, y, contentW, 7, "F");
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(148, 210, 255);
        pdf.text(analysisMetadata?.x_axis || "Label", margin + 2, y + 5);
        pdf.text(analysisMetadata?.series_label || "Value", margin + colW[0] + 2, y + 5);
        y += 8;

        // Table rows
        chartData.labels.forEach((label: string, i: number) => {
          checkY(6);
          const rowBg = i % 2 === 0 ? [20, 28, 44] : [15, 23, 42];
          pdf.setFillColor(...(rowBg as [number, number, number]));
          pdf.rect(margin, y - 4, contentW, 6, "F");
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(200, 200, 200);
          const labelStr = String(label).slice(0, 40);
          const valStr = chartData.values[i] != null
            ? Number(chartData.values[i]).toLocaleString(undefined, { maximumFractionDigits: 4 })
            : "—";
          pdf.text(labelStr, margin + 2, y);
          pdf.text(valStr, margin + colW[0] + 2, y);
          y += 6;
        });
        y += 6;
      }

      /* ── Forecast Data Table ── */
      if (forecastData?.available && forecastData?.points?.length > 0) {
        sectionTitle(`7-Day Forecast  —  ${forecastData.method || "Time-Series Model"}`);
        labelValue("Target Column", forecastData.target_column || "—");
        labelValue("Date Column", forecastData.date_column || "—");
        y += 2;

        // Header
        checkY(8);
        pdf.setFillColor(30, 41, 59);
        pdf.rect(margin, y, contentW, 7, "F");
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(148, 210, 255);
        pdf.text("Forecast Date", margin + 2, y + 5);
        pdf.text("Predicted Value", margin + contentW * 0.5 + 2, y + 5);
        y += 8;

        forecastData.points.forEach((pt: { date: string; value: number }, i: number) => {
          checkY(6);
          const rowBg = i % 2 === 0 ? [20, 28, 44] : [15, 23, 42];
          pdf.setFillColor(...(rowBg as [number, number, number]));
          pdf.rect(margin, y - 4, contentW, 6, "F");
          pdf.setFontSize(8);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(200, 200, 200);
          pdf.text(String(pt.date), margin + 2, y);
          pdf.setTextColor(16, 185, 129);
          pdf.text(
            Number(pt.value).toLocaleString(undefined, { maximumFractionDigits: 4 }),
            margin + contentW * 0.5 + 2,
            y
          );
          y += 6;
        });
        y += 6;
      }

      /* ── Footer on last page ── */
      pdf.setFontSize(7);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`AURA Analyst Report  ·  ${baseName}  ·  ${new Date().toLocaleDateString()}`, margin, pageH - 6);

      pdf.save(`${baseName}_report.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
      alert("PDF export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  /* ── CSV: summary + insights + chart data + forecast ── */
  const exportCSV = () => {
    setLoading("csv");
    setOpen(false);
    try {
      const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const rows: string[][] = [];

      // Metadata section
      rows.push(["AURA Analyst — Analysis Report"]);
      rows.push(["Generated", new Date().toLocaleString()]);
      rows.push(["Source File", filename]);
      if (analysisMetadata) {
        rows.push(["Dataset Type", analysisMetadata.dataset_type || ""]);
        rows.push(["Rows", String(analysisMetadata.rows || "")]);
        rows.push(["Columns", String(analysisMetadata.columns || "")]);
        rows.push(["Target Column", analysisMetadata.target_column || ""]);
        rows.push(["Date Column", analysisMetadata.date_column || ""]);
        rows.push(["AI Model", analysisMetadata.model_used || ""]);
      }
      rows.push([]);

      // Summary
      if (summary) {
        rows.push(["EXECUTIVE SUMMARY"]);
        let displaySummary = summary.trim();
        if (displaySummary.startsWith("{") || displaySummary.startsWith("[")) {
          try {
            const parsed = JSON.parse(displaySummary);
            displaySummary =
              parsed?.dataset_overview?.summary ||
              parsed?.summary ||
              "See JSON export for full structured analysis.";
          } catch { displaySummary = "See JSON export for full structured analysis."; }
        }
        rows.push([displaySummary]);
        rows.push([]);
      }

      // Insights
      if (insights.length > 0) {
        rows.push(["KEY INSIGHTS"]);
        rows.push(["#", "Insight"]);
        insights.forEach((ins, i) => rows.push([String(i + 1), insightText(ins)]));
        rows.push([]);
      }

      // Chart data
      if (chartData?.labels?.length > 0) {
        rows.push(["CHART DATA"]);
        rows.push([
          analysisMetadata?.x_axis || "Label",
          analysisMetadata?.series_label || "Value",
        ]);
        chartData.labels.forEach((label: string, i: number) => {
          rows.push([label, String(chartData.values?.[i] ?? "")]);
        });
        rows.push([]);
      }

      // Forecast data
      if (forecastData?.available && forecastData?.points?.length > 0) {
        rows.push(["7-DAY FORECAST"]);
        rows.push(["Method", forecastData.method || ""]);
        rows.push(["Date", "Predicted Value"]);
        forecastData.points.forEach((pt: { date: string; value: number }) => {
          rows.push([pt.date, String(pt.value)]);
        });
      }

      const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
      downloadText(csv, `${baseName}_full_report.csv`, "text/csv");
    } catch (e) {
      console.error("CSV export failed:", e);
    } finally {
      setLoading(null);
    }
  };

  /* ── JSON: full structured export ── */
  const exportJSON = () => {
    setLoading("json");
    setOpen(false);
    try {
      let parsedSummary: any = summary;
      try { parsedSummary = JSON.parse(summary); } catch { /* keep as string */ }

      const payload = {
        report_meta: {
          generated_at: new Date().toISOString(),
          source_file: filename,
          tool: "AURA Analyst v2.0.0",
        },
        analysis_metadata: analysisMetadata || null,
        executive_summary: parsedSummary,
        insights: insights.map((ins, i) => ({ index: i + 1, text: insightText(ins) })),
        chart_data: chartData
          ? {
            chart_type: chartData.chart_type,
            x_axis: chartData.x_axis || analysisMetadata?.x_axis,
            y_axis: chartData.y_axis || analysisMetadata?.target_column,
            series_label: analysisMetadata?.series_label,
            data_points: chartData.labels?.map((label: string, i: number) => ({
              label,
              value: chartData.values?.[i] ?? null,
            })) || [],
          }
          : null,
        forecast: forecastData?.available
          ? {
            method: forecastData.method,
            date_column: forecastData.date_column,
            target_column: forecastData.target_column,
            horizon_days: forecastData.horizon_days,
            points: forecastData.points,
          }
          : { available: false, reason: forecastData?.reason },
      };

      downloadText(
        JSON.stringify(payload, null, 2),
        `${baseName}_analysis.json`,
        "application/json"
      );
    } catch (e) {
      console.error("JSON export failed:", e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={openDropdown}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-sm text-slate-200 transition-colors"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
        ) : (
          <Download className="w-4 h-4 text-blue-400" />
        )}
        Export
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed w-56 bg-slate-800 border border-slate-600/50 rounded-xl shadow-2xl z-50 overflow-hidden"
            style={{ top: dropdownStyle.top, right: dropdownStyle.right }}
          >
            {/* PDF */}
            <button
              onClick={exportPDF}
              disabled={!!loading}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">Export as PDF</div>
                <div className="text-xs text-slate-400">Structured report with tables</div>
              </div>
            </button>

            <div className="border-t border-slate-700/50" />

            {/* CSV */}
            <button
              onClick={exportCSV}
              disabled={!!loading}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">Export as CSV</div>
                <div className="text-xs text-slate-400">Insights + chart + forecast data</div>
              </div>
            </button>

            <div className="border-t border-slate-700/50" />

            {/* JSON */}
            <button
              onClick={exportJSON}
              disabled={!!loading}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <FileJson className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium">Export as JSON</div>
                <div className="text-xs text-slate-400">Full structured analysis data</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
