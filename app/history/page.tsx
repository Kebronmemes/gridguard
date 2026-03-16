"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, ArrowLeft, Search, Filter, Clock, MapPin } from "lucide-react";
import type { Outage } from "@/lib/types";

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  moderate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  grid_failure: 'bg-red-900/20 text-red-300 border-red-800/30',
};

export default function HistoryPage() {
  const [history, setHistory] = useState<Outage[]>([]);
  const [areaFilter, setAreaFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [daysFilter, setDaysFilter] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (areaFilter) params.set('area', areaFilter);
      if (severityFilter) params.set('severity', severityFilter);
      params.set('days', daysFilter.toString());

      try {
        const res = await fetch(`/api/outages/history?${params}`);
        const data = await res.json();
        setHistory(data.history || []);
      } catch { setHistory([]); }
      setLoading(false);
    };
    fetchHistory();
  }, [areaFilter, severityFilter, daysFilter]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-white">Outage History</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Filters */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-slate-500" />
          <input value={areaFilter} onChange={e => setAreaFilter(e.target.value)}
            placeholder="Filter by area..." className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:border-blue-500 outline-none w-48" />
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none">
            <option value="">All Severity</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="critical">Critical</option>
            <option value="grid_failure">Grid Failure</option>
          </select>
          <select value={daysFilter} onChange={e => setDaysFilter(Number(e.target.value))}
            className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none">
            <option value={7}>Past 7 days</option>
            <option value={30}>Past 30 days</option>
            <option value={90}>Past 90 days</option>
            <option value={365}>Past year</option>
          </select>
          <span className="text-xs text-slate-500 ml-auto">{history.length} results</span>
        </div>

        {/* History List */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-slate-600">No historical outages found for the selected filters.</div>
        ) : (
          <div className="space-y-3">
            {history.map(o => (
              <div key={o.id} className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm text-white">{o.area} <span className="text-xs text-slate-600 font-normal">{o.id}</span></h4>
                    <p className="text-xs text-slate-400 mt-0.5">{o.reason}</p>
                    <div className="flex flex-wrap gap-2 mt-1.5 text-[11px]">
                      <span className={`px-1.5 py-0.5 rounded border ${SEVERITY_COLORS[o.severity]}`}>{o.severity}</span>
                      <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(o.startTime).toLocaleDateString()}</span>
                      <span className="text-slate-500">Reports: {o.reportCount}</span>
                    </div>
                  </div>
                </div>
                {o.resolvedAt && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] text-green-400 font-medium">Resolved</p>
                    <p className="text-[10px] text-slate-600">{new Date(o.resolvedAt).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500">Duration: {((new Date(o.resolvedAt).getTime() - new Date(o.startTime).getTime()) / 3600000).toFixed(1)}h</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
