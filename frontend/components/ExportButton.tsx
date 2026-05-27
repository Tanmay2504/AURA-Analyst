"use client";

import { useState } from "react";
import { Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";

interface ExportButtonProps {
  targetId: string;       // id of the DOM element to capture
  filename?: string;
  insights?: any[];
  summary?: string;
  chartData?: any;
}

export default function ExportButton({
  targetId,
  filename = "analysis",
  insights = [],
  summary = "",
  chartData,
}: ExportButtonProps) {
  const [loading, setLoading] = useState<"pdf" | "csv" | null>(null);
  const [open, setOpen] = useState(false);

  const exportPDF = async () => {
    setLoading("pdf");
    setOpen(false);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      const element = document.getElementById(targetId);
      if (!element) throw new Error("Target element not found");

      const canvas = await html2canvas(element, {
        scale: 1.5,
        backgroundColor: "#0f172a",
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;

      // Header
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageW, 20, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("AURA Analyst — Analysis Report", 10, 13);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Generated: ${new Date().toLocaleString()}  |  File: ${filename}`, 10, 18);

      // Dashboard screenshot
      let yPos = 25;
      if (imgH <= pageH - 30) {
        pdf.addImage(imgData, "PNG", 10, yPos, imgW, imgH);
        yPos += imgH + 8;
      } else {
        // Multi-page for tall dashboards
        let remaining = imgH;
        let srcY = 0;
        while (remaining > 0) {
          const sliceH = Math.min(remaining, pageH - 30);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = (sliceH / imgW) * canvas.width;
          const ctx = sliceCanvas.getContext("2d")!;
          ctx.drawImage(canvas, 0, srcY * (canvas.width / imgW), canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
          pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 10, yPos, imgW, sliceH);
          remaining -= sliceH;
          srcY += sliceH;
          if (remaining > 0) { pdf.addPage(); yPos = 10; }
        }
        yPos = pageH - 20;
      }

      // Insights text page
      if (insights.length > 0) {
        pdf.addPage();
        pdf.setFillColor(15, 23, 42);
        pdf.rect(0, 0, pageW, pageH, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        pdf.text("Key Insights", 10, 15);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(203, 213, 225);
        let y = 25;
        insights.slice(0, 20).forEach((ins: any, i: number) => {
          const text = typeof ins === "string" ? ins : ins.insight || ins.title || JSON.stringify(ins);
          const lines = pdf.splitTextToSize(`${i + 1}. ${text}`, pageW - 20);
          if (y + lines.length * 5 > pageH - 10) { pdf.addPage(); y = 15; }
          pdf.text(lines, 10, y);
          y += lines.length * 5 + 3;
        });
      }

      pdf.save(`${filename.replace(/\.csv$/, "")}_report.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
      alert("PDF export failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const exportCSV = () => {
    setLoading("csv");
    setOpen(false);
    try {
      if (!chartData?.labels || !chartData?.values) {
        // Export insights as CSV
        const rows = [["#", "Insight"]];
        insights.forEach((ins: any, i: number) => {
          const text = typeof ins === "string" ? ins : ins.insight || ins.title || JSON.stringify(ins);
          rows.push([String(i + 1), `"${text.replace(/"/g, '""')}"`]);
        });
        const csv = rows.map((r) => r.join(",")).join("\n");
        downloadText(csv, `${filename.replace(/\.csv$/, "")}_insights.csv`, "text/csv");
      } else {
        const rows = [["Label", "Value"]];
        chartData.labels.forEach((label: string, i: number) => {
          rows.push([`"${label}"`, String(chartData.values[i] ?? "")]);
        });
        const csv = rows.map((r) => r.join(",")).join("\n");
        downloadText(csv, `${filename.replace(/\.csv$/, "")}_chart_data.csv`, "text/csv");
      }
    } catch (e) {
      console.error("CSV export failed:", e);
    } finally {
      setLoading(null);
    }
  };

  const downloadText = (content: string, name: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600/50 rounded-xl text-sm text-slate-200 transition-colors"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
        ) : (
          <Download className="w-4 h-4 text-blue-400" />
        )}
        Export
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-slate-800 border border-slate-600/50 rounded-xl shadow-xl z-50 overflow-hidden">
          <button
            onClick={exportPDF}
            disabled={!!loading}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-red-400" />
            Export as PDF
          </button>
          <div className="border-t border-slate-700/50" />
          <button
            onClick={exportCSV}
            disabled={!!loading}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Export as CSV
          </button>
        </div>
      )}
    </div>
  );
}
