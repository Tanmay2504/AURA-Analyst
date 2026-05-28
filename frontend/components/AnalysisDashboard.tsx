"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Lightbulb, TrendingUp, Database, AlertTriangle, CheckCircle, Info } from 'lucide-react';

// ── Terminal theme tokens ──────────────────────────────────────────────────
const T = {
  card: "border border-[#2a2a1e] bg-[#0f0f0b]",
  cardHover: "hover:border-[#f97316]/40",
  header: "border-b border-[#2a2a1e] bg-[#141410] px-4 py-2 font-mono text-[10px] text-[#7a7060] uppercase tracking-widest",
  amber: "#f97316",
  amberDim: "#c2410c",
  green: "#4ade80",
  purple: "#a78bfa",
  text: "#e8e0cc",
  textDim: "#7a7060",
  textMuted: "#3d3a2e",
  border: "#2a2a1e",
  bg: "#0a0a08",
  bg2: "#0f0f0b",
};

interface AnalysisDashboardProps {
  summary?: string;
  insights?: string[];
  chartData?: {
    labels?: string[];
    values?: number[];
    [key: string]: unknown;
  };
  data?: {
    summary: string;
    insights: string[];
    chart_data: { labels: string[]; values: number[] };
  };
  forecastData?: {
    available?: boolean;
    method?: string;
    date_column?: string;
    target_column?: string;
    horizon_days?: number;
    points?: Array<{ date: string; value: number }>;
    reason?: string;
  } | null;
  analysisMetadata?: {
    dataset_type?: string;
    date_column?: string | null;
    target_column?: string | null;
    category_column?: string | null;
    chart_title?: string;
    series_label?: string;
    rows?: number;
    columns?: number;
    model_used?: string;
  } | null;
  filename?: string;
}

export default function AnalysisDashboard({
  summary,
  insights,
  chartData,
  data,
  forecastData,
  analysisMetadata,
  filename
}: AnalysisDashboardProps) {
  // Support both old and new props
  const actualSummary = summary || data?.summary || '';
  const actualInsights = insights || data?.insights || [];
  const actualChartData = chartData || data?.chart_data;

  // Helpers: detect dates, parse, format numbers, infer label
  const isDateString = (s: string) => {
    // basic ISO / YYYY-MM-DD / MM/DD/YYYY checks
    if (!s) return false;
    // Try Date parse — if Invalid Date then treat as non-date
    const d = new Date(s);
    return !Number.isNaN(d.getTime());
  };

  const parseDate = (s: string) => {
    const d = new Date(s);
    return d;
  };

  const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

  const inferSeriesLabel = () => {
    // Priority: forecastData.target_column -> filename keywords -> sample label keywords
    if (forecastData?.target_column) return forecastData.target_column.replace(/_/g, ' ');
    if (filename) {
      const name = filename.toLowerCase();
      if (name.includes('covid') || name.includes('cases') || name.includes('confirmed')) return 'COVID Cases';
      if (name.includes('death')) return 'COVID Deaths';
      if (name.includes('vacc') || name.includes('vax')) return 'Vaccinations';
      if (name.includes('sales') || name.includes('revenue')) return 'Sales';
    }
    // fallback: scan labels for keywords
    const sampleLabels = actualChartData?.labels || [];
    const joined = sampleLabels.join(' ').toLowerCase();
    if (joined.includes('case') || joined.includes('confirmed')) return 'COVID Cases';
    if (joined.includes('death')) return 'Deaths';
    if (joined.includes('sales') || joined.includes('revenue')) return 'Sales';
    return 'Value';
  };

  // Map chart_data to recharts format
  let mappedChartData =
    actualChartData?.labels?.map((label: string, idx: number) => ({
      name: label,
      value: (actualChartData.values as number[])?.[idx] ?? 0,
    })) || [];

  // If labels look like dates, sort chronologically to avoid mis-ordered time-series
  const labelsAreDates = mappedChartData.length > 0 && mappedChartData.every((r) => isDateString(r.name));
  if (labelsAreDates) {
    mappedChartData = mappedChartData
      .map((r) => ({ ...r, __parsedDate: parseDate(r.name) }))
      .sort((a: any, b: any) => (a.__parsedDate as Date).getTime() - (b.__parsedDate as Date).getTime())
      .map((r) => ({ name: r.name, value: r.value }));
  }

  const forecastPoints = forecastData?.available ? forecastData.points || [] : [];

  // Combine historical and forecast data for proper scaling
  const combinedTimeSeriesData = [
    ...(mappedChartData.map((item: any) => ({
      date: item.name,
      value: item.value,
      type: 'historical',
    })) || []),
    ...(forecastPoints.map((point: any) => ({
      date: point.date,
      value: point.value,
      type: 'forecast',
    })) || []),
  ];

  const seriesLabel = analysisMetadata?.series_label || inferSeriesLabel();
  const chartTitle = analysisMetadata?.chart_title || 'Data Visualization';
  const forecastTitle = analysisMetadata?.series_label
    ? `${analysisMetadata.series_label} Trend & Forecast`
    : `${seriesLabel} Trend & Forecast`;

  const tooltipFormatter = (value: any) => {
    if (value == null) return ['—', seriesLabel];
    const num = Number(value);
    if (Number.isInteger(num)) return [numberFormatter.format(num), seriesLabel];
    return [numberFormatter.format(num), seriesLabel];
  };

  // Parse JSON from summary if it contains a JSON code block or raw JSON
  const parsedSummary = useMemo(() => {
    if (!actualSummary) return null;
    // Strip markdown code fences
    const stripped = actualSummary
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    try {
      const parsed = JSON.parse(stripped);
      return parsed;
    } catch {
      return null;
    }
  }, [actualSummary]);

  // Render a JSON value recursively in a readable way
  const renderJsonValue = (value: any, depth = 0): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-slate-500">—</span>;
    if (typeof value === 'boolean') return <span className={value ? 'text-emerald-400' : 'text-red-400'}>{String(value)}</span>;
    if (typeof value === 'number') return <span className="text-amber-300">{numberFormatter.format(value)}</span>;
    if (typeof value === 'string') return <span className="text-slate-300">{value}</span>;
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-slate-500">—</span>;
      return (
        <ul className="mt-1 space-y-1 pl-3 border-l border-slate-600">
          {value.map((item, i) => (
            <li key={i} className="text-sm">
              {typeof item === 'object' && item !== null
                ? renderJsonValue(item, depth + 1)
                : <span className="flex gap-2"><span className="text-blue-400 flex-shrink-0">•</span><span className="text-slate-300">{String(item)}</span></span>
              }
            </li>
          ))}
        </ul>
      );
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) return null;
      return (
        <div className={depth > 0 ? 'mt-1 pl-3 border-l border-slate-700 space-y-2' : 'space-y-3'}>
          {entries.map(([k, v]) => {
            const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const isSimple = typeof v !== 'object' || v === null;
            return (
              <div key={k} className={depth === 0 ? 'rounded-lg bg-slate-800/60 p-3 border border-slate-700/50' : ''}>
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-300">{label}</span>
                {isSimple
                  ? <div className="mt-0.5 text-sm text-slate-300">{renderJsonValue(v, depth + 1)}</div>
                  : <div className="mt-1">{renderJsonValue(v, depth + 1)}</div>
                }
              </div>
            );
          })}
        </div>
      );
    }
    return <span className="text-slate-300">{String(value)}</span>;
  };

  // Extract top-level summary text from parsed JSON if available
  const getSummaryText = (parsed: any): string => {
    if (!parsed) return '';
    // Try common summary fields - check multiple nesting levels
    const report = parsed.analysis_report || parsed;
    // Direct dataset_overview.summary
    if (report.dataset_overview?.summary) return String(report.dataset_overview.summary);
    // Direct summary string
    if (report.summary && typeof report.summary === 'string') return report.summary;
    // Nested title
    if (report.metadata?.title) return String(report.metadata.title);
    // dataset_overview.title as fallback
    if (report.dataset_overview?.title) return String(report.dataset_overview.title);
    // Any top-level string field named "description" or "overview"
    if (report.description && typeof report.description === 'string') return report.description;
    if (report.overview && typeof report.overview === 'string') return report.overview;
    return '';
  };

  // Extract key findings/insights from parsed JSON
  const getKeyFindings = (parsed: any): Array<{ title: string; detail: string; severity?: string }> => {
    if (!parsed) return [];
    const report = parsed.analysis_report || parsed;
    const findings: Array<{ title: string; detail: string; severity?: string }> = [];

    // From significant_findings
    const sigFindings = report.statistical_insights?.significant_findings || report.significant_findings || [];
    for (const f of sigFindings) {
      if (f.finding || f.title) {
        findings.push({ title: f.finding || f.title, detail: f.detail || f.description || '', severity: f.significance });
      }
    }

    // From recommendations
    const recs = report.business_insights?.actionable_recommendations || report.recommendations || [];
    for (const r of recs) {
      if (r.recommendation && findings.length < 8) {
        findings.push({ title: r.recommendation, detail: r.rationale || r.action || '', severity: r.priority });
      }
    }

    return findings.slice(0, 8);
  };

  // If parsedSummary exists, use extracted text; if extraction returns empty, use a generic title from the JSON
  const summaryText = parsedSummary
    ? (getSummaryText(parsedSummary) || parsedSummary?.dataset_overview?.summary || parsedSummary?.summary || '')
    : ((() => {
      // If actualSummary looks like JSON, don't show it raw
      const trimmed = actualSummary?.trim() || '';
      if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('```')) return '';
      return trimmed;
    })());
  const keyFindings = parsedSummary ? getKeyFindings(parsedSummary) : [];
  const parsedReport = parsedSummary?.analysis_report || parsedSummary;

  return (
    <div className="w-full space-y-6">
      {/* Filename Header */}
      {filename && (
        <div className="flex items-center gap-2 font-mono text-xs text-[#7a7060]">
          <Database className="h-3.5 w-3.5 text-[#f97316]" />
          <span><span className="text-[#f97316]">$</span> aura analyze <span className="text-[#e8e0cc]">{filename}</span></span>
        </div>
      )}

      {/* Executive Summary Card */}
      <div className={`${T.card} ${T.cardHover} transition-all`}>
        <div className={T.header}>
          <TrendingUp className="h-3 w-3 text-[#f97316] inline mr-1" />
          executive_summary
        </div>
        <div className="p-4">
          {analysisMetadata?.model_used && (
            <div className="mb-3 inline-flex border border-[#f97316]/30 bg-[#f97316]/5 px-3 py-1 font-mono text-[10px] text-[#f97316]">
              // model: {analysisMetadata.model_used}
            </div>
          )}
          {summaryText ? (
            <p className="font-mono text-xs leading-relaxed text-[#e8e0cc]">{summaryText}</p>
          ) : (
            <p className="font-mono text-xs text-[#3d3a2e] italic">// no summary available</p>
          )}
        </div>
      </div>

      {/* Key Findings from parsed JSON */}
      {keyFindings.length > 0 && (
        <div className={`${T.card} ${T.cardHover} transition-all`}>
          <div className={T.header}>
            <AlertTriangle className="h-3 w-3 text-[#f97316] inline mr-1" />
            key_findings &amp; recommendations
          </div>
          <div className="p-4 space-y-2">
            {keyFindings.map((f, i) => {
              const isHigh = f.severity?.toUpperCase() === 'HIGH';
              const isMod = f.severity?.toUpperCase() === 'MODERATE';
              return (
                <div key={i} className="flex gap-3 border border-[#2a2a1e] p-3">
                  <span className={`font-mono text-xs font-bold flex-shrink-0 w-5 text-center
                    ${isHigh ? 'text-[#f87171]' : isMod ? 'text-[#f97316]' : 'text-[#7a7060]'}`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-mono text-xs font-bold text-[#e8e0cc]">{f.title}</p>
                    {f.detail && <p className="mt-0.5 font-mono text-[10px] text-[#7a7060]">{f.detail}</p>}
                    {f.severity && (
                      <span className={`mt-1 inline-block font-mono text-[9px] px-2 py-0.5 border
                        ${isHigh ? 'border-[#f87171]/30 text-[#f87171]' : isMod ? 'border-[#f97316]/30 text-[#f97316]' : 'border-[#2a2a1e] text-[#3d3a2e]'}`}>
                        {f.severity}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dataset Overview */}
      {parsedReport?.dataset_overview && (
        <div className={`${T.card} ${T.cardHover} transition-all`}>
          <div className={T.header}><Database className="h-3 w-3 text-[#f97316] inline mr-1" />dataset_overview</div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {parsedReport.dataset_overview.key_facts && Object.entries(parsedReport.dataset_overview.key_facts)
                .filter(([, v]) => typeof v !== 'object' || v === null)
                .map(([k, v]: [string, any]) => (
                  <div key={k} className="border border-[#2a2a1e] p-2">
                    <p className="font-mono text-[9px] text-[#3d3a2e] uppercase tracking-wide">{k.replace(/_/g, ' ')}</p>
                    <p className="font-mono text-xs font-bold text-[#e8e0cc] mt-0.5">{String(v)}</p>
                  </div>
                ))}
              {parsedReport.dataset_overview.overall_class_average !== undefined && (
                <div className="border border-[#f97316]/30 bg-[#f97316]/5 p-2">
                  <p className="font-mono text-[9px] text-[#f97316] uppercase tracking-wide">overall avg</p>
                  <p className="font-mono text-xs font-bold text-[#e8e0cc] mt-0.5">{parsedReport.dataset_overview.overall_class_average}</p>
                </div>
              )}
            </div>
            {parsedReport.dataset_overview.subject_mean_scores && (
              <div className="mt-4 space-y-2">
                <p className="font-mono text-[10px] text-[#3d3a2e] uppercase tracking-widest">// subject mean scores</p>
                {Object.entries(parsedReport.dataset_overview.subject_mean_scores).map(([subj, score]: [string, any]) => (
                  <div key={subj} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-[#7a7060] w-28 flex-shrink-0 truncate">{subj}</span>
                    <div className="flex-1 bg-[#2a2a1e] h-1.5">
                      <div className="h-1.5 bg-[#f97316]" style={{ width: `${Math.min(100, score)}%` }} />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-[#f97316] w-10 text-right">{score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Quality */}
      {parsedReport?.data_quality_assessment && (
        <div className={`${T.card} ${T.cardHover} transition-all`}>
          <div className={T.header}><CheckCircle className="h-3 w-3 text-[#4ade80] inline mr-1" />data_quality_assessment</div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {parsedReport.data_quality_assessment.completeness?.status && (
                <div className="border border-[#4ade80]/30 bg-[#4ade80]/5 p-2">
                  <p className="font-mono text-[9px] text-[#4ade80] uppercase">completeness</p>
                  <p className="font-mono text-xs font-bold text-[#e8e0cc] mt-0.5">{parsedReport.data_quality_assessment.completeness.status}</p>
                </div>
              )}
              {parsedReport.data_quality_assessment.duplicate_records?.status && (
                <div className="border border-[#2a2a1e] p-2">
                  <p className="font-mono text-[9px] text-[#3d3a2e] uppercase">duplicates</p>
                  <p className="font-mono text-xs font-bold text-[#e8e0cc] mt-0.5">{parsedReport.data_quality_assessment.duplicate_records.count ?? 0}</p>
                </div>
              )}
              {parsedReport.data_quality_assessment.outliers?.status && (
                <div className="border border-[#2a2a1e] p-2">
                  <p className="font-mono text-[9px] text-[#3d3a2e] uppercase">outliers</p>
                  <p className="font-mono text-xs font-bold text-[#4ade80] mt-0.5">{parsedReport.data_quality_assessment.outliers.status}</p>
                </div>
              )}
            </div>
            {parsedReport.data_quality_assessment.completeness?.assessment && (
              <p className="mt-3 font-mono text-[10px] text-[#7a7060] italic border-l-2 border-[#2a2a1e] pl-3">{parsedReport.data_quality_assessment.completeness.assessment}</p>
            )}
          </div>
        </div>
      )}

      {/* Statistical Insights */}
      {parsedReport?.statistical_insights && (
        <div className={`${T.card} ${T.cardHover} transition-all`}>
          <div className={T.header}><Info className="h-3 w-3 text-purple-400 inline mr-1" />statistical_insights</div>
          <div className="p-4 space-y-4">
            {parsedReport.statistical_insights.descriptive_statistics?.subject_rankings_by_mean_score && (
              <div>
                <p className="font-mono text-[10px] text-[#3d3a2e] uppercase tracking-widest mb-2">// subject rankings</p>
                <div className="space-y-1.5">
                  {parsedReport.statistical_insights.descriptive_statistics.subject_rankings_by_mean_score.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 border border-[#2a2a1e] p-2">
                      <span className="font-mono text-[10px] font-bold text-purple-400 w-6 text-center">#{s.rank}</span>
                      <span className="flex-1 font-mono text-xs text-[#e8e0cc]">{s.subject}</span>
                      <span className="font-mono text-xs font-bold text-[#f97316]">{s.mean}</span>
                      <span className="font-mono text-[9px] text-[#3d3a2e]">max:{s.max}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {parsedReport.statistical_insights.correlation_analysis?.top_correlations && (
              <div>
                <p className="font-mono text-[10px] text-[#3d3a2e] uppercase tracking-widest mb-2">// top correlations</p>
                <div className="space-y-1.5">
                  {parsedReport.statistical_insights.correlation_analysis.top_correlations.slice(0, 5).map((c: any, i: number) => (
                    <div key={i} className="border border-[#2a2a1e] p-2">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-xs text-[#e8e0cc]">{c.pair}</p>
                        <span className="font-mono text-xs font-bold text-[#f97316]">{c.correlation}</span>
                      </div>
                      <p className="font-mono text-[9px] text-purple-400 mt-0.5">{c.strength}</p>
                      {c.interpretation && <p className="font-mono text-[9px] text-[#7a7060] mt-0.5">{c.interpretation}</p>}
                    </div>
                  ))}
                </div>
                {parsedReport.statistical_insights.correlation_analysis.key_finding && (
                  <p className="mt-2 font-mono text-[10px] text-[#e8e0cc] italic border-l-2 border-[#f97316]/40 pl-3">
                    {parsedReport.statistical_insights.correlation_analysis.key_finding}
                  </p>
                )}
              </div>
            )}
            {parsedReport.statistical_insights.correlations && !parsedReport.statistical_insights.correlation_analysis && (
              <div className="space-y-2">
                {Object.entries(parsedReport.statistical_insights.correlations).map(([key, val]: [string, any]) => (
                  <div key={key} className="border border-[#2a2a1e] p-2">
                    <p className="font-mono text-[9px] uppercase tracking-wide text-purple-400">{key.replace(/_/g, ' ')}</p>
                    {val.correlation !== undefined && (
                      <p className="font-mono text-xs text-[#e8e0cc] mt-0.5">r=<span className="font-bold text-[#f97316]">{val.correlation}</span> · <span className="text-[#7a7060]">{val.strength}</span></p>
                    )}
                    {val.interpretation && <p className="font-mono text-[9px] text-[#7a7060] mt-0.5">{val.interpretation}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Insights */}
      {actualInsights.length > 0 && (
        <div className={`${T.card} ${T.cardHover} transition-all`}>
          <div className={T.header}><Lightbulb className="h-3 w-3 text-[#f97316] inline mr-1" />key_insights</div>
          <div className="p-4 space-y-2">
            {actualInsights.map((insight: string, i: number) => (
              <div key={i} className="flex gap-3 border border-[#2a2a1e] p-2.5">
                <span className="font-mono text-[10px] font-bold text-[#f97316] flex-shrink-0 w-5 text-center">{i + 1}</span>
                <span className="font-mono text-xs text-[#e8e0cc] leading-relaxed">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bar Chart */}
      {mappedChartData.length > 0 && (
        <div className={`${T.card} ${T.cardHover} transition-all`}>
          <div className={T.header}><BarChart className="h-3 w-3 text-[#4ade80] inline mr-1" />{chartTitle.toLowerCase().replace(/ /g, '_')}</div>
          <div className="p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mappedChartData} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a1e" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: '#7a7060', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: '#7a7060', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f0f0b', border: '1px solid #f97316', borderRadius: 0, color: '#e8e0cc', fontFamily: 'JetBrains Mono', fontSize: 11 }} cursor={{ fill: 'rgba(249,115,22,0.05)' }} />
                <Legend wrapperStyle={{ paddingTop: '12px', color: '#7a7060', fontFamily: 'JetBrains Mono', fontSize: 10 }} />
                <Bar dataKey="value" fill="#f97316" radius={0} animationDuration={600} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Forecast Chart */}
      {forecastData?.available && forecastPoints.length > 0 && (
        <div className={`${T.card} ${T.cardHover} transition-all`}>
          <div className={T.header}><TrendingUp className="h-3 w-3 text-[#4ade80] inline mr-1" />7_day_forecast</div>
          <div className="p-4">
            <p className="font-mono text-[10px] text-[#3d3a2e] mb-3">
              {forecastData.method ? `// method: ${forecastData.method}` : '// forecast from detected time-series'}
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedTimeSeriesData} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a1e" />
                  <XAxis dataKey="date" tick={{ fill: '#7a7060', fontSize: 10, fontFamily: 'JetBrains Mono' }} angle={-25} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: '#7a7060', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f0f0b', border: '1px solid #f97316', borderRadius: 0, color: '#e8e0cc', fontFamily: 'JetBrains Mono', fontSize: 11 }} formatter={tooltipFormatter} />
                  <Legend wrapperStyle={{ paddingTop: '12px', color: '#7a7060', fontFamily: 'JetBrains Mono', fontSize: 10 }} />
                  <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, payload, index } = props;
                      const isHist = payload.type === 'historical';
                      return <circle key={`dot-${index}`} cx={cx} cy={cy} r={isHist ? 2 : 4} fill={isHist ? '#7a7060' : '#f97316'} stroke={isHist ? '#3d3a2e' : '#c2410c'} strokeWidth={1.5} />;
                    }}
                    activeDot={{ r: 6, fill: '#f97316' }} name={forecastTitle} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex gap-6">
              <div className="flex items-center gap-2"><div className="h-2 w-2 bg-[#7a7060]" /><span className="font-mono text-[10px] text-[#7a7060]">historical</span></div>
              <div className="flex items-center gap-2"><div className="h-2 w-2 bg-[#f97316]" /><span className="font-mono text-[10px] text-[#7a7060]">forecast</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-[#2a2a1e] p-3 text-center">
          <p className="font-mono text-[9px] text-[#3d3a2e] uppercase tracking-widest">insights</p>
          <p className="font-mono text-2xl font-bold text-[#f97316]">{actualInsights.length}</p>
        </div>
        <div className="border border-[#2a2a1e] p-3 text-center">
          <p className="font-mono text-[9px] text-[#3d3a2e] uppercase tracking-widest">data_points</p>
          <p className="font-mono text-2xl font-bold text-[#4ade80]">{mappedChartData.length}</p>
        </div>
        <div className="border border-[#4ade80]/30 bg-[#4ade80]/5 p-3 text-center">
          <p className="font-mono text-[9px] text-[#3d3a2e] uppercase tracking-widest">status</p>
          <p className="font-mono text-sm font-bold text-[#4ade80]">✓ complete</p>
        </div>
      </div>
    </div>
  );
}
