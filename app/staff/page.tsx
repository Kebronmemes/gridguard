"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Map as MapIcon, Users, Edit3, LogOut, PlusCircle, CheckCircle, Clock, AlertTriangle, RefreshCw, Zap, Wrench } from "lucide-react";
import dynamic from "next/dynamic";
import type { Outage, FeedItem } from "@/lib/types";

const StaffInteractiveMap = dynamic(() => import('@/components/StaffMap'), { ssr: false });

export default function StaffPortal() {
  const [activeTab, setActiveTab] = useState("map");
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState('');
  const [outages, setOutages] = useState<Outage[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [citizenReports, setCitizenReports] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  // ... existing form states ...

  const fetchData = useCallback(async () => {
    try {
      const [oRes, fRes, rRes] = await Promise.all([
        fetch('/api/outages'),
        fetch('/api/outages/feed'),
        fetch('/api/staff/reports'),
      ]);
      const oData = await oRes.json();
      const fData = await fRes.json();
      const rData = await rRes.json();
      setOutages(oData.outages || []);
      setFeed(fData.feed || []);
      setCitizenReports(rData.reports || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 8000); return () => clearInterval(i); }, [fetchData]);

  // ... mid sections ...

  const sidebarItems = [
    { key: 'map', icon: <MapIcon className="w-5 h-5" />, label: 'Live Grid Map' },
    { key: 'incidents', icon: <Edit3 className="w-5 h-5" />, label: 'Incident Management' },
    { key: 'maintenance', icon: <Wrench className="w-5 h-5" />, label: 'Maintenance' },
    { key: 'reports', icon: <Users className="w-5 h-5" />, label: 'Citizen Reports' },
    { key: 'feed', icon: <RefreshCw className="w-5 h-5" />, label: 'System Feeds' },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* ... sidebar ... */}
      <main className="flex-1 flex flex-col">
        <header className="h-14 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-6">
          <h1 className="text-sm font-semibold text-slate-300">
            {activeTab === 'map' && 'Grid Intelligence Map'}
            {activeTab === 'incidents' && 'Active Incident Management'}
            {activeTab === 'maintenance' && 'Maintenance Announcements'}
            {activeTab === 'reports' && 'Actual Citizen Reports Queue'}
            {activeTab === 'feed' && 'Official System Feeds'}
          </h1>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs text-slate-500">Live • {outages.length} active</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {/* ... tabs ... */}
          {activeTab === 'reports' && (
            <div className="space-y-3">
              {citizenReports.map(r => (
                <div key={r.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-blue-400 font-bold">{r.area[0]}</div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">{r.area}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 max-w-xl">{r.description || 'No description provided'}</p>
                      <div className="flex gap-3 mt-2 text-[11px] text-slate-500">
                        <span>IP: {r.ip_hash ? '***' + r.ip_hash.slice(-4) : 'Unknown'}</span>
                        <span>Time: {new Date(r.created_at).toLocaleString()}</span>
                        <span className={`px-1.5 py-0.5 rounded ${r.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400'}`}>{r.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors">Dismiss</button>
                    <button className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors">Verify</button>
                  </div>
                </div>
              ))}
              {citizenReports.length === 0 && <p className="text-center text-slate-600 py-12">No citizen reports currently in queue</p>}
            </div>
          )}

          {activeTab === 'feed' && (
            <div className="space-y-2">
              {feed.slice(0, 40).map(f => (
                <div key={f.id} className="bg-slate-800/30 border border-slate-700/30 rounded-lg px-4 py-3 flex items-start gap-3">
                  <Zap className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-300">{f.message}</p>
                    <p className="text-[11px] text-slate-600 mt-1">{new Date(f.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Outage Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Create Official Outage Report</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">Area</label>
                <input value={createForm.area} onChange={e => setCreateForm({ ...createForm, area: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none" placeholder="e.g. Bole" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase">Reason / Cause</label>
                <input value={createForm.reason} onChange={e => setCreateForm({ ...createForm, reason: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none" placeholder="e.g. Transformer failure" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Type</label>
                  <select value={createForm.type} onChange={e => setCreateForm({ ...createForm, type: e.target.value })}
                    className="mt-1 w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none">
                    <option value="emergency">Emergency</option>
                    <option value="planned">Planned</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="load_shedding">Load Shedding</option>
                    <option value="technical_fault">Technical Fault</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase">Severity</label>
                  <select value={createForm.severity} onChange={e => setCreateForm({ ...createForm, severity: e.target.value })}
                    className="mt-1 w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none">
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="critical">Critical</option>
                    <option value="grid_failure">Grid Failure</option>
                  </select>
                </div>
              </div>
              {createStatus && <p className="text-sm text-center">{createStatus}</p>}
              <button onClick={handleCreate} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors">Create Outage Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
