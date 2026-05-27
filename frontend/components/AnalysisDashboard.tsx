"use client";

import React, { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Lightbulb, TrendingUp, Database, AlertTriangle, CheckCircle, Info } from 'lucide-react';

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
  const getKeyFindings = (parsed: any): Array<{title: string; detail: string; severity?: string}> => {
    if (!parsed) return [];
    const report = parsed.analysis_report || parsed;
    const findings: Array<{title: string; detail: string; severity?: string}> = [];

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
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Database className="h-4 w-4" />
          <span>Analyzing: <span className="text-blue-400">{filename}</span></span>
        </div>
      )}

      {/* Executive Summary Card */}
      <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Executive Summary</h2>
        </div>
        {analysisMetadata?.model_used && (
          <div className="mb-3 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
            Model: {analysisMetadata.model_used}
          </div>
        )}
        {summaryText ? (
          <p className="leading-relaxed text-slate-300">{summaryText}</p>
        ) : (
          <p className="leading-relaxed text-slate-400 italic">No summary available</p>
        )}
      </div>

      {/* Key Findings from parsed JSON */}
      {keyFindings.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Key Findings & Recommendations</h2>
          </div>
          <div className="space-y-3">
            {keyFindings.map((f, i) => {
              const isHigh = f.severity?.toUpperCase() === 'HIGH';
              const isMod = f.severity?.toUpperCase() === 'MODERATE';
              return (
                <div key={i} className="flex gap-3 rounded-lg bg-slate-800/60 p-3 border border-slate-700/50">
                  <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold
                    ${isHigh ? 'bg-red-500/20 text-red-400' : isMod ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    {f.detail && <p className="mt-0.5 text-xs text-slate-400">{f.detail}</p>}
                    {f.severity && (
                      <span className={`mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full
                        ${isHigh ? 'bg-red-500/10 text-red-400' : isMod ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-600/50 text-slate-400'}`}>
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

      {/* Dataset Overview Card (from parsed JSON) */}
      {parsedReport?.dataset_overview && (
        <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Dataset Overview</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {parsedReport.dataset_overview.key_facts && Object.entries(parsedReport.dataset_overview.key_facts)
              .filter(([, v]) => typeof v !== 'object' || v === null)
              .map(([k, v]: [string, any]) => (
                <div key={k} className="rounded-lg bg-slate-800/60 p-3 border border-slate-700/50">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">{k.replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{String(v)}</p>
                </div>
              ))}
            {parsedReport.dataset_overview.overall_class_average !== undefined && (
              <div className="rounded-lg bg-blue-500/10 p-3 border border-blue-500/30">
                <p className="text-xs text-blue-300 uppercase tracking-wide">Overall Average</p>
                <p className="mt-1 text-sm font-semibold text-white">{parsedReport.dataset_overview.overall_class_average}</p>
              </div>
            )}
          </div>
          {parsedReport.dataset_overview.subject_mean_scores && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Subject Mean Scores</p>
              <div className="space-y-2">
                {Object.entries(parsedReport.dataset_overview.subject_mean_scores).map(([subj, score]: [string, any]) => (
                  <div key={subj} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-slate-300 flex-shrink-0">{subj}</span>
                    <div className="flex-1 rounded-full bg-slate-700 h-2">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(100, score)}%` }} />
                    </div>
                    <span className="w-12 text-right text-sm font-semibold text-amber-300">{score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Quality Card (from parsed JSON) */}
      {parsedReport?.data_quality_assessment && (
        <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Data Quality Assessment</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {/* Completeness status */}
            {parsedReport.data_quality_assessment.completeness?.status && (
              <div className="rounded-lg bg-emerald-500/10 p-3 border border-emerald-500/30">
                <p className="text-xs text-emerald-300 uppercase tracking-wide">Completeness</p>
                <p className="mt-1 text-sm font-semibold text-white">{parsedReport.data_quality_assessment.completeness.status}</p>
              </div>
            )}
            {parsedReport.data_quality_assessment.duplicate_records?.status && (
              <div className="rounded-lg bg-slate-800/60 p-3 border border-slate-700/50">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Duplicates</p>
                <p className="mt-1 text-sm font-semibold text-white">{parsedReport.data_quality_assessment.duplicate_records.count ?? 0}</p>
              </div>
            )}
            {parsedReport.data_quality_assessment.outliers?.status && (
              <div className="rounded-lg bg-slate-800/60 p-3 border border-slate-700/50">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Outliers</p>
                <p className="mt-1 text-sm font-semibold text-emerald-400">{parsedReport.data_quality_assessment.outliers.status}</p>
              </div>
            )}
          </div>
          {parsedReport.data_quality_assessment.completeness?.assessment && (
            <p className="mt-3 text-sm text-slate-400 italic">{parsedReport.data_quality_assessment.completeness.assessment}</p>
          )}
          {parsedReport.data_quality_assessment.outliers?.interpretation && (
            <p className="mt-2 text-sm text-slate-400">{parsedReport.data_quality_assessment.outliers.interpretation}</p>
          )}
        </div>
      )}

      {/* Statistical Insights Card (from parsed JSON) */}
      {parsedReport?.statistical_insights && (
        <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Statistical Insights</h2>
          </div>

          {/* Subject rankings */}
          {parsedReport.statistical_insights.descriptive_statistics?.subject_rankings_by_mean_score && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Subject Rankings by Mean Score</p>
              <div className="space-y-2">
                {parsedReport.statistical_insights.descriptive_statistics.subject_rankings_by_mean_score.map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 rounded bg-slate-800/50 p-2">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-300">#{s.rank}</span>
                    <span className="flex-1 text-sm text-white">{s.subject}</span>
                    <span className="text-sm font-semibold text-amber-300">{s.mean}</span>
                    <span className="text-xs text-slate-500">max: {s.max}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top correlations */}
          {parsedReport.statistical_insights.correlation_analysis?.top_correlations && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Top Correlations</p>
              <div className="space-y-2">
                {parsedReport.statistical_insights.correlation_analysis.top_correlations.slice(0, 5).map((c: any, i: number) => (
                  <div key={i} className="rounded-lg bg-slate-800/60 p-3 border border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{c.pair}</p>
                      <span className="text-sm font-bold text-amber-300">{c.correlation}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-purple-300">{c.strength}</p>
                    {c.interpretation && <p className="mt-1 text-xs text-slate-400">{c.interpretation}</p>}
                  </div>
                ))}
              </div>
              {parsedReport.statistical_insights.correlation_analysis.key_finding && (
                <p className="mt-3 text-sm text-slate-300 italic border-l-2 border-purple-500 pl-3">
                  {parsedReport.statistical_insights.correlation_analysis.key_finding}
                </p>
              )}
            </div>
          )}

          {/* Flat correlations object (legacy) */}
          {parsedReport.statistical_insights.correlations && !parsedReport.statistical_insights.correlation_analysis && (
            <div className="space-y-3">
              {Object.entries(parsedReport.statistical_insights.correlations).map(([key, val]: [string, any]) => (
                <div key={key} className="rounded-lg bg-slate-800/60 p-3 border border-slate-700/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-300">{key.replace(/_/g, ' ')}</p>
                  {val.correlation !== undefined && (
                    <p className="mt-1 text-sm text-white">Correlation: <span className="font-bold text-amber-300">{val.correlation}</span> — <span className="text-slate-400">{val.strength}</span></p>
                  )}
                  {val.interpretation && <p className="mt-1 text-xs text-slate-400">{val.interpretation}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Key Insights Card */}
      {actualInsights.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Key Insights</h2>
          </div>
          <ul className="space-y-3">
            {actualInsights.map((insight: string, i: number) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-semibold text-blue-400">
                  {i + 1}
                </span>
                <span className="text-slate-300">{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Visual Data Chart */}
      {mappedChartData.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <BarChart className="h-5 w-5 text-green-400" />
            <h2 className="text-xl font-bold text-white">{chartTitle}</h2>
          </div>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mappedChartData}
                margin={{ top: 20, right: 30, left: 0, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fill: '#cbd5e1', fontSize: 12 }}
                />
                <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: '20px',
                    color: '#cbd5e1',
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#3b82f6"
                  radius={[8, 8, 0, 0]}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Forecast Chart */}
      {forecastData?.available && forecastPoints.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">7-Day Forecast</h2>
          </div>
          <div className="mb-3 text-sm text-slate-400">
            {forecastData.method ? `Method: ${forecastData.method}` : 'Forecast generated from detected time-series data'}
          </div>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={combinedTimeSeriesData}
                margin={{ top: 20, right: 30, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#cbd5e1', fontSize: 12 }}
                  angle={-25}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                  formatter={tooltipFormatter}
                />
                <Legend wrapperStyle={{ paddingTop: '16px', color: '#cbd5e1' }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const isHistorical = payload.type === 'historical';
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isHistorical ? 3 : 5}
                        fill={isHistorical ? '#3b82f6' : '#10b981'}
                        stroke={isHistorical ? '#1e40af' : '#059669'}
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{ r: 7 }}
                  name={forecastTitle}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-slate-400">Historical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-slate-400">Forecast</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
          <p className="text-sm text-slate-400">Insights</p>
          <p className="text-2xl font-bold text-blue-400">{actualInsights.length}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
          <p className="text-sm text-slate-400">Data Points</p>
          <p className="text-2xl font-bold text-green-400">{mappedChartData.length}</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
          <p className="text-sm text-slate-400">Status</p>
          <p className="text-2xl font-bold text-emerald-400">✓ Complete</p>
        </div>
      </div>
    </div>
  );
}
