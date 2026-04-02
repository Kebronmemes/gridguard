"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldAlert, Map as MapIcon, Users, Edit3, LogOut, 
  PlusCircle, CheckCircle, Clock, AlertTriangle, 
  RefreshCw, Zap, Wrench, ChevronRight
} from "lucide-react";
import dynamic from "next/dynamic";
import type { Outage, FeedItem } from "@/lib/types";

const StaffInteractiveMap = dynamic(() => import('@/components/StaffMap'), { ssr: false });

export default function StaffPortal() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("map");
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState('');
  const [outages, setOutages] = useState<Outage[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [citizenReports, setCitizenReports] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    area: '',
    reason: '',
    type: 'emergency',
    severity: 'moderate'
  });
  const [createStatus, setCreateStatus] = useState('');

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

  const filteredOutages = useMemo(() => {
    const seen = new Set();
    return outages.filter(o => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      const name = o.area?.toLowerCase().replace(/\s+/g, '') || '';
      return !(name === 'addisababa' || name === 'addisabeaba');
    });
  }, [outages]);

  const filteredReports = useMemo(() => {
    return citizenReports.filter(r => {
      const name = r.area?.toLowerCase().replace(/\s+/g, '') || '';
      return !(name === 'addisababa' || name === 'addisabeaba');
    });
  }, [citizenReports]);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 8000); return () => clearInterval(i); }, [fetchData]);

  useEffect(() => {
    const savedToken = localStorage.getItem('gridguard_token');
    const savedUser = localStorage.getItem('gridguard_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } else {
      router.push('/staff/login');
    }
  }, [router]);

  const handleResolve = async (id: string) => {
    if (!window.confirm("Confirm resolution of this outage?")) return;
    try {
      const res = await fetch('/api/staff/outages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id, status: 'resolved' }),
      });
      if (res.ok) fetchData();
      else {
        const d = await res.json();
        alert(d.error || "Failed to resolve outage");
      }
    } catch (e) { console.error(e); }
  };

  const handleVerifyReport = async (id: string) => {
    try {
      const res = await fetch('/api/staff/reports/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reportId: id, action: 'verify' }),
      });
      if (res.ok) fetchData();
    } catch (err) { console.error('Verification failed', err); }
  };

  const handleDismissReport = async (id: string) => {
    try {
      const res = await fetch('/api/staff/reports/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reportId: id, action: 'dismiss' }),
      });
      if (res.ok) fetchData();
    } catch (err) { console.error('Dismissal failed', err); }
  };

  const handleCreate = async () => {
    if (!createForm.area) {
      setCreateStatus('Area is required');
      return;
    }
    setCreateStatus('Creating...');
    try {
      const res = await fetch('/api/staff/outages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateStatus('Created successfully!');
        setShowCreateModal(false);
        fetchData();
        setCreateForm({ area: '', reason: '', type: 'emergency', severity: 'moderate' });
      } else {
        setCreateStatus(data.error || 'Failed to create report');
      }
    } catch (e) {
      setCreateStatus('Error occurred');
    }
  };

  const sidebarItems = [
    { key: 'map', icon: <MapIcon className="w-5 h-5" />, label: 'Live Grid Map' },
    { key: 'incidents', icon: <AlertTriangle className="w-5 h-5" />, label: 'Incident Control' },
    { key: 'reports', icon: <Users className="w-5 h-5" />, label: 'Verification Queue' },
    { key: 'feed', icon: <RefreshCw className="w-5 h-5" />, label: 'System Logs' },
  ];

  if (!user) return null;

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm block">Staff Portal</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{user.role}</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all group ${
                activeTab === item.key 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {activeTab === item.key && <ChevronRight className="w-4 h-4" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => { localStorage.removeItem('gridguard_token'); router.push('/staff/login'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8">
          <div>
            <h1 className="text-lg font-bold text-white capitalize">
              {activeTab.replace('_', ' ')} Control
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Force Outage Event
            </button>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live Server Connection
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          {/* MAP VIEW */}
          {activeTab === 'map' && (
            <div className="h-full bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden relative shadow-2xl">
              <StaffInteractiveMap token={token} onRefresh={fetchData} />
            </div>
          )}

          {/* INCIDENTS VIEW */}
          {activeTab === 'incidents' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOutages.map(o => (
                  <div key={o.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-white text-lg">{o.area}</h3>
                        <p className="text-xs text-slate-500">{o.district} • {o.subcity}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        o.severity === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {o.severity}
                      </span>
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Zap className="w-4 h-4 text-blue-400" />
                        <span>{o.reason || 'Cause under investigation'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span>Started: {new Date(o.start_time).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleResolve(o.id)}
                      className="w-full py-2.5 bg-green-600/10 hover:bg-green-600 text-green-400 hover:text-white rounded-xl text-sm font-bold border border-green-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" /> Mark as Resolved
                    </button>
                  </div>
                ))}
              </div>
              {filteredOutages.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center text-slate-600 italic">
                  <CheckCircle className="w-12 h-12 mb-3 opacity-20" />
                  <p>No active incidents found in the grid.</p>
                </div>
              )}
            </div>
          )}

          {/* REPORTS VIEW - PREVIOUS CODE PRESERVED */}
          {activeTab === 'reports' && (
            <div className="space-y-3">
              {filteredReports.map(r => (
                <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400 font-bold text-lg">
                      {r.area[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">{r.area}</h4>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-1 max-w-2xl">{r.description || 'Citizen reported an outage without details.'}</p>
                      <div className="flex gap-4 mt-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(r.created_at).toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded-full ${r.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'}`}>
                          {r.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors">Dismiss</button>
                    <button className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-colors">Verify Incident</button>
                  </div>
                </div>
              ))}
              {filteredReports.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center text-slate-600">
                  <Users className="w-12 h-12 mb-3 opacity-20" />
                  <p className="italic">Verification queue is currently empty.</p>
                </div>
              )}
            </div>
          )}

          {/* FEED VIEW */}
          {activeTab === 'feed' && (
            <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                <h3 className="font-bold text-slate-300 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-blue-400" /> Real-time System Event Logs</h3>
              </div>
              <div className="divide-y divide-slate-800">
                {feed.map(f => (
                  <div key={f.id} className="p-5 flex items-start gap-4 hover:bg-slate-800/20 transition-colors">
                    <div className="mt-1"><Zap className="w-4 h-4 text-blue-500" /></div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">{f.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">{new Date(f.timestamp).toLocaleTimeString()}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">{f.area}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* CREATE OUTAGE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white">Manual Event Override</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Affected Area</label>
                <input value={createForm.area} onChange={e => setCreateForm({ ...createForm, area: e.target.value })}
                  className="mt-1 w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-red-500 transition-all" placeholder="e.g. Bole Medhanialem" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Specific Cause</label>
                <input value={createForm.reason} onChange={e => setCreateForm({ ...createForm, reason: e.target.value })}
                  className="mt-1 w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-red-500 transition-all" placeholder="e.g. KV-3 Line Failure" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Event Type</label>
                  <select value={createForm.type} onChange={e => setCreateForm({ ...createForm, type: e.target.value })}
                    className="mt-1 w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none">
                    <option value="emergency">Emergency</option>
                    <option value="planned">Planned</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Severity</label>
                  <select value={createForm.severity} onChange={e => setCreateForm({ ...createForm, severity: e.target.value })}
                    className="mt-1 w-full px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white outline-none">
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              
              {createStatus && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold text-center">
                  {createStatus}
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreate}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all"
                >
                  Trigger Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
