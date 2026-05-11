"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
  filename?: string;
}

export default function AnalysisDashboard({
  summary,
  insights,
  chartData,
  data,
  filename
}: AnalysisDashboardProps) {
  // Support both old and new props
  const actualSummary = summary || data?.summary || '';
  const actualInsights = insights || data?.insights || [];
  const actualChartData = chartData || data?.chart_data;

  // Map chart_data to recharts format
  const mappedChartData =
    actualChartData?.labels?.map((label: string, idx: number) => ({
      name: label,
      value: (actualChartData.values as number[])?.[idx] || 0,
    })) || [];

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
            <h2 className="text-xl font-bold text-white">Data Visualization</h2>
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
