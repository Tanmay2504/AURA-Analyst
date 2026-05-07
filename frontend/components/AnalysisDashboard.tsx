"use client";
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalysisProps {
  data: {
    summary: string;
    insights: string[];
    chart_data: { labels: string[]; values: number[] };
  };
}

export default function AnalysisDashboard({ data }: AnalysisProps) {
  // Map chart_data to recharts format
  const chartData = data.chart_data?.labels?.map((label, idx) => ({
    name: label,
    value: data.chart_data.values[idx] || 0
  })) || [];

  return (
    <div className="w-full max-w-4xl mt-8 space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Executive Summary</h2>
        <p className="text-slate-600">{data.summary}</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Key Insights</h2>
        <ul className="list-disc pl-5 space-y-2">
          {data.insights?.map((insight, i) => (
            <li key={i} className="text-slate-700">{insight}</li>
          ))}
        </ul>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Visual Data</h2>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
