"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import type { AnalyticsData } from '@/lib/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const chartOpts = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      titleColor: '#e2e8f0',
      bodyColor: '#cbd5e1',
      borderColor: '#334155',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
    y: { beginAtZero: true, grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 11 } }, border: { display: false } },
  },
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | 'week' | 'month' | 'year'>('week');

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics');
      const json = await res.json();
      setData(json);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000);
    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  if (!data) {
    return <div className="h-64 bg-slate-800/50 rounded-2xl animate-pulse flex items-center justify-center text-slate-500">Loading analytics...</div>;
  }

  function getTimeData() {
    if (timeRange === '24h') return { labels: data!.hourlyData.map(d => d.hour), values: data!.hourlyData.map(d => d.count) };
    if (timeRange === 'week') return { labels: data!.dailyData.map(d => d.day), values: data!.dailyData.map(d => d.count) };
    if (timeRange === 'month') return { labels: data!.weeklyData.map(d => d.week), values: data!.weeklyData.map(d => d.count) };
    return { labels: data!.monthlyData.map(d => d.month), values: data!.monthlyData.map(d => d.count) };
  }

  const td = getTimeData();
  const lineData = {
    labels: td.labels,
    datasets: [{
      fill: true,
      label: 'Outages',
      data: td.values,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: '#3b82f6',
    }],
  };

  const severityData = {
    labels: ['Low', 'Moderate', 'Critical', 'Grid Failure'],
    datasets: [{
      data: [data.outagesBySeverity.low, data.outagesBySeverity.moderate, data.outagesBySeverity.critical, data.outagesBySeverity.grid_failure],
      backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444', '#7c2d12'],
      borderWidth: 0,
    }],
  };

  const topAreas = Object.entries(data.outagesByArea).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const areaData = {
    labels: topAreas.map(a => a[0]),
    datasets: [{
      label: 'Outages',
      data: topAreas.map(a => a[1]),
      backgroundColor: '#0047AB',
      borderRadius: 6,
    }],
  };

  const tabs = [
    { key: '24h', label: '24 Hours' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'year', label: 'Year' },
  ] as const;

  return (
    <div className="space-y-6 w-full">
      {/* Time Range Tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTimeRange(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeRange === t.key ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Outage Frequency Chart */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 p-6 rounded-2xl lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-1">Outage Frequency</h3>
          <p className="text-xs text-slate-500 mb-4">{timeRange === '24h' ? 'Hourly' : timeRange === 'week' ? 'Daily' : timeRange === 'month' ? 'Weekly' : 'Monthly'} incident count</p>
          <div className="h-[250px]">
            <Line options={chartOpts as any} data={lineData} />
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-1">Severity Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Breakdown by severity level</p>
          <div className="h-[250px] flex items-center justify-center">
            <Doughnut data={severityData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 15, usePointStyle: true, pointStyleWidth: 8 } } }, cutout: '65%' }} />
          </div>
        </div>

        {/* Most Affected Areas */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 p-6 rounded-2xl lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-1">Most Affected Areas</h3>
          <p className="text-xs text-slate-500 mb-4">Top areas by total outage incidents</p>
          <div className="h-[250px]">
            <Bar options={chartOpts as any} data={areaData} />
          </div>
        </div>

        {/* Reliability Stats */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">Performance Metrics</h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">Grid Reliability</span>
                <span className="text-white font-bold">{data.gridReliability.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${data.gridReliability}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">Avg. Restoration</span>
                <span className="text-white font-bold">{(data.averageRestorationMinutes / 60).toFixed(1)}h</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, 100 - data.averageRestorationMinutes / 10)}%` }} />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-700 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Active Outages</span>
                <span className="text-red-400 font-bold">{data.activeOutages}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Resolved Today</span>
                <span className="text-green-400 font-bold">{data.resolvedToday}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Historical</span>
                <span className="text-slate-300 font-bold">{data.totalOutages}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
