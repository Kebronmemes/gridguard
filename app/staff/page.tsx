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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ area: '', reason: '', type: 'emergency', severity: 'moderate', estimatedRestoreTime: '' });
  const [createStatus, setCreateStatus] = useState('');
  const [maintForm, setMaintForm] = useState({ area: '', reason: '', startTime: '', expectedDuration: '2 hours', notes: '' });
  const [maintStatus, setMaintStatus] = useState('');
  const router = useRouter();

  useEffect(() => {
    const t = localStorage.getItem('gridguard_token');
    const u = localStorage.getItem('gridguard_user');
    if (!t || !u) { router.push('/staff/login'); return; }
    setToken(t);
    setUser(JSON.parse(u));
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const [oRes, fRes] = await Promise.all([
        fetch('/api/outages'),
        fetch('/api/outages/feed'),
      ]);
      const oData = await oRes.json();
      const fData = await fRes.json();
      setOutages(oData.outages || []);
      setFeed(fData.feed || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 8000); return () => clearInterval(i); }, [fetchData]);

  // --- Staff Location Tracking (every 20 minutes) ---
  useEffect(() => {
    if (!token) return;
    const sendLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            fetch('/api/staff/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            }).catch(() => {});
          },
          () => {} // silently fail if denied
        );
      }
    };
    sendLocation(); // initial
    const locInterval = setInterval(sendLocation, 20 * 60 * 1000); // every 20 min
    return () => clearInterval(locInterval);
  }, [token]);


  const handleCreate = async () => {
    if (!createForm.area || !createForm.reason) return;
    try {
      const res = await fetch('/api/staff/outages', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...createForm, estimatedRestoreTime: createForm.estimatedRestoreTime || new Date(Date.now() + 4 * 3600000).toISOString() }),
      });
      const data = await res.json();
      if (data.success) {
        setCreateStatus('Success: Outage created');
        setCreateForm({ area: '', reason: '', type: 'emergency', severity: 'moderate', estimatedRestoreTime: '' });
        fetchData();
        setTimeout(() => { setShowCreateModal(false); setCreateStatus(''); }, 1500);
      } else { setCreateStatus(`Error: ${data.error}`); }
    } catch { setCreateStatus('Error: Failed'); }
  };

  const handleUpdate = async (id: string, status: string) => {
    try {
      await fetch('/api/staff/outages', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id, status }),
      });
      fetchData();
    } catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('gridguard_user');
    router.push('/staff/login');
  };

  const handleMaintenance = async () => {
    if (!maintForm.area || !maintForm.reason) return;
    try {
      const res = await fetch('/api/staff/maintenance', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(maintForm),
      });
      const data = await res.json();
      if (data.success) {
        setMaintStatus(`Success: Maintenance posted! ${data.subscribersNotified} subscribers notified.`);
        setMaintForm({ area: '', reason: '', startTime: '', expectedDuration: '2 hours', notes: '' });
        fetchData();
        setTimeout(() => setMaintStatus(''), 3000);
      } else { setMaintStatus(`Error: ${data.error}`); }
    } catch { setMaintStatus('Error: Failed'); }
  };

  if (!user) return <div className="h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  const sidebarItems = [
    { key: 'map', icon: <MapIcon className="w-5 h-5" />, label: 'Live Grid Map' },
    { key: 'incidents', icon: <Edit3 className="w-5 h-5" />, label: 'Incident Management' },
    { key: 'maintenance', icon: <Wrench className="w-5 h-5" />, label: 'Maintenance' },
    { key: 'reports', icon: <Users className="w-5 h-5" />, label: 'Citizen Reports' },
    { key: 'feed', icon: <RefreshCw className="w-5 h-5" />, label: 'Event Feed' },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center"><ShieldAlert className="w-4 h-4 text-white" /></div>
          <div>
            <span className="font-bold text-sm">EEU Command</span>
            <span className="block text-[10px] text-slate-500 uppercase tracking-wider">{user.role}</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItems.map(item => (
            <button key={item.key} onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === item.key ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              {item.icon} <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button onClick={() => setShowCreateModal(true)} className="w-full flex items-center gap-2 px-3 py-2.5 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-all border border-red-500/20 mb-2">
            <PlusCircle className="w-4 h-4" /> Report Outage
          </button>
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">{user.name[0]}</div>
              <span className="text-xs text-slate-400">{user.name}</span>
            </div>
            <button onClick={handleLogout} className="text-slate-600 hover:text-red-400 transition-colors"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <header className="h-14 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-6">
          <h1 className="text-sm font-semibold text-slate-300">
            {activeTab === 'map' && 'Grid Intelligence Map'}
            {activeTab === 'incidents' && 'Active Incident Management'}
            {activeTab === 'maintenance' && 'Maintenance Announcements'}
            {activeTab === 'reports' && 'Citizen Reports Queue'}
            {activeTab === 'feed' && 'System Event Feed'}
          </h1>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs text-slate-500">Live • {outages.length} active</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4">
          {/* Map Tab */}
          {activeTab === 'map' && (
            <div className="h-full bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
              <StaffInteractiveMap token={token} onRefresh={fetchData} />
            </div>
          )}

          {/* Incidents Tab */}
          {activeTab === 'incidents' && (
            <div className="space-y-3">
              {outages.map(o => (
                <div key={o.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${o.severity === 'critical' || o.severity === 'grid_failure' ? 'bg-red-500 animate-pulse' : o.severity === 'moderate' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div>
                      <h4 className="font-semibold text-white text-sm">{o.area} <span className="text-xs text-slate-500 font-normal ml-2">{o.id}</span></h4>
                      <p className="text-xs text-slate-400 mt-0.5">{o.reason}</p>
                      <div className="flex gap-3 mt-1 text-[11px] text-slate-500">
                        <span>Reports: {o.reportCount}</span>
                        <span>ETA: {new Date(o.estimatedRestoreTime).toLocaleTimeString()}</span>
                        <span className={`px-1.5 py-0.5 rounded ${o.status === 'active' ? 'bg-red-500/20 text-red-400' : o.status === 'repair_in_progress' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {o.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {o.status !== 'repair_in_progress' && (
                      <button onClick={() => handleUpdate(o.id, 'repair_in_progress')} className="px-3 py-1.5 text-xs bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 hover:bg-amber-500/20 transition-colors">Dispatched</button>
                    )}
                    <button onClick={() => handleUpdate(o.id, 'resolved')} className="px-3 py-1.5 text-xs bg-green-500/10 text-green-400 rounded-lg border border-green-500/20 hover:bg-green-500/20 transition-colors">Resolve</button>
                  </div>
                </div>
              ))}
              {outages.length === 0 && <p className="text-center text-slate-600 py-12">No active incidents</p>}
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="max-w-lg space-y-4">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Wrench className="w-4 h-4 text-amber-400" /> Schedule Maintenance</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Area</label>
                    <select value={maintForm.area} onChange={e => setMaintForm({ ...maintForm, area: e.target.value })}
                      className="mt-1 w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none text-sm">
                      <option value="">Select area...</option>
                      {['Bole','Yeka','Arada','Kirkos','Lideta','Gulele','Kolfe Keranio','Nifas Silk-Lafto','Akaki Kaliti','Piassa','Merkato','Kazanchis','Sarbet','Megenagna','CMC','Ayat','Bahir Dar','Hawassa','Dire Dawa','Adama','Jimma'].map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Reason</label>
                    <input value={maintForm.reason} onChange={e => setMaintForm({ ...maintForm, reason: e.target.value })}
                      className="mt-1 w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none text-sm" placeholder="e.g. Transformer replacement" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase">Start Time</label>
                      <input type="datetime-local" value={maintForm.startTime} onChange={e => setMaintForm({ ...maintForm, startTime: e.target.value })}
                        className="mt-1 w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase">Duration</label>
                      <select value={maintForm.expectedDuration} onChange={e => setMaintForm({ ...maintForm, expectedDuration: e.target.value })}
                        className="mt-1 w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none text-sm">
                        <option value="30 minutes">30 minutes</option>
                        <option value="1 hour">1 hour</option>
                        <option value="2 hours">2 hours</option>
                        <option value="4 hours">4 hours</option>
                        <option value="6 hours">6 hours</option>
                        <option value="8 hours">8 hours</option>
                        <option value="12 hours">12 hours</option>
                        <option value="24 hours">24 hours</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Notes (optional)</label>
                    <textarea value={maintForm.notes} onChange={e => setMaintForm({ ...maintForm, notes: e.target.value })}
                      className="mt-1 w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none text-sm resize-none h-16" placeholder="Additional details for subscribers..." />
                  </div>
                  {maintStatus && <p className="text-sm text-center">{maintStatus}</p>}
                  <button onClick={handleMaintenance} className="w-full py-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 font-semibold rounded-lg transition-colors text-sm">
                    Post Maintenance & Notify Subscribers
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feed Tab */}
          {(activeTab === 'feed' || activeTab === 'reports') && (
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
