"use client";

import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Lightbulb, TrendingUp, Database } from 'lucide-react';

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
        <p className="leading-relaxed text-slate-300">
          {actualSummary || 'No summary available'}
        </p>
      </div>

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
