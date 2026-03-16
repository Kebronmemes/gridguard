"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { PowerOff, CheckCircle, Zap, Bell, Clock, TrendingUp, Phone, Mail } from 'lucide-react';
import AnalyticsDashboard from '@/components/Analytics';
import LocationSearch from '@/components/LocationSearch';
import type { Outage, FeedItem, AnalyticsData } from '@/lib/types';

const InteractiveMap = dynamic(() => import('@/components/Map'), { ssr: false });

export default function MapPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [reportForm, setReportForm] = useState({ area: '', description: '', severity: 'moderate' });
  const [reportStatus, setReportStatus] = useState('');
  const [subForm, setSubForm] = useState({ email: '', name: '', area: '' });
  const [subStatus, setSubStatus] = useState('');
  
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [districtHistory, setDistrictHistory] = useState<any[]>([]);

  const fetchDistrictData = useCallback(async (district: string) => {
    try {
      const res = await fetch(`/api/outages/history?area=${encodeURIComponent(district)}`);
      if (res.ok) {
        const data = await res.json();
        setDistrictHistory(data.history || []);
      }
    } catch (e) { console.error('Error fetching district history', e); }
  }, []);

  useEffect(() => {
    if (selectedDistrict) {
      fetchDistrictData(selectedDistrict);
    }
  }, [selectedDistrict, fetchDistrictData]);

  const fetchLive = useCallback(async () => {
    try {
      const [analyticsRes, feedRes] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/outages/feed'),
      ]);
      setAnalytics(await analyticsRes.json());
      const feedData = await feedRes.json();
      setFeed(feedData.feed || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 8000);
    return () => clearInterval(interval);
  }, [fetchLive]);

  const handleReport = async () => {
    if (!reportForm.area) return;
    try {
      const res = await fetch('/api/outages/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportForm),
      });
      const data = await res.json();
      if (data.success) {
        setReportStatus('Success: Report submitted successfully!');
        setReportForm({ area: '', description: '', severity: 'moderate' });
        setTimeout(() => { setShowReportModal(false); setReportStatus(''); }, 2000);
      }
    } catch { setReportStatus('Error: Failed to submit report'); }
  };

  const handleSubscribe = async () => {
    if (!subForm.email || !subForm.area) return;
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subForm),
      });
      const data = await res.json();
      if (data.success) {
        setSubStatus('Success: Subscribed! Check your email for confirmation.');
        setSubForm({ email: '', name: '', area: '' });
        setTimeout(() => { setShowSubscribeModal(false); setSubStatus(''); }, 3000);
      } else {
        setSubStatus(`Error: ${data.error || 'Failed'}`);
      }
    } catch { setSubStatus('Error: Connection error'); }
  };

  const feedIcon = (type: string) => {
    switch (type) {
      case 'outage_reported': return <PowerOff className="w-3.5 h-3.5 text-red-400" />;
      case 'outage_resolved': return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
      case 'maintenance_scheduled': return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      case 'citizen_report': return <Bell className="w-3.5 h-3.5 text-blue-400" />;
      default: return <Zap className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const feedColor = (type: string) => {
    switch (type) {
      case 'outage_reported': return 'border-red-500/50';
      case 'outage_resolved': return 'border-green-500/50';
      case 'maintenance_scheduled': return 'border-amber-500/50';
      case 'citizen_report': return 'border-blue-500/50';
      default: return 'border-slate-500/50';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">GridGuard</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500 border-l border-slate-700 pl-2">Ethiopia</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <Link href="/history" className="hover:text-white transition-colors">History</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/feedback" className="hover:text-white transition-colors">Feedback</Link>
            <button onClick={() => setShowSubscribeModal(true)} className="hover:text-white transition-colors flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" /> Subscribe
            </button>
          </nav>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowReportModal(true)} className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-all border border-red-500/20">
              Report Outage
            </button>
            <Link href="/staff/login" className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all border border-slate-700">
              Staff Portal
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Hero */}
        <section className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            Live Electricity <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">Outage Intelligence</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mb-5">
            Real-time grid monitoring, analytics, and service updates for the Ethiopian Electric Utility.
          </p>

          {/* Search — Google Maps-style Autocomplete for Ethiopia */}
          <LocationSearch
            onSelect={(area, coords) => {
              setFlyTo(coords);
              setSelectedDistrict(area);
            }}
            placeholder="Search area, district, or city to view local history..."
            className="max-w-lg"
          />
        </section>

        {/* Stats Bar */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: <PowerOff className="w-5 h-5" />, label: 'Active Outages', value: analytics.activeOutages, color: 'text-red-400', bg: 'bg-red-500/10' },
              { icon: <CheckCircle className="w-5 h-5" />, label: 'Resolved Today', value: analytics.resolvedToday, color: 'text-green-400', bg: 'bg-green-500/10' },
              { icon: <TrendingUp className="w-5 h-5" />, label: 'Grid Reliability', value: `${analytics.gridReliability.toFixed(1)}%`, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { icon: <Clock className="w-5 h-5" />, label: 'Avg. Restore', value: `${(analytics.averageRestorationMinutes / 60).toFixed(1)}h`, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            ].map((s, i) => (
              <div key={i} className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-4 flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center ${s.color}`}>{s.icon}</div>
                <div>
                  <p className="text-2xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Map + Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
          <div className="lg:col-span-3 h-[550px] bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden relative">
            <InteractiveMap flyTo={flyTo} />
            <div className="absolute top-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-lg border border-slate-700/50 rounded-xl p-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Legend</h3>
              <div className="flex flex-col gap-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Low</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Moderate</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span> Critical</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-900"></span> Grid Failure</div>
              </div>
            </div>
          </div>

          {/* Sidebar Panel for Feed or Drilldown */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-5 flex flex-col max-h-[550px]">
            {selectedDistrict ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white tracking-wide">{selectedDistrict}</h3>
                  <button onClick={() => { setSelectedDistrict(null); setFlyTo(null); }} className="text-xs text-blue-400 font-semibold px-2 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20">
                    Live Addis Ababa
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-4">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Local Outage Reports</p>
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-extrabold text-white">{districtHistory.length}</span>
                      <span className="text-sm text-slate-400 mb-1">Total Found</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs text-slate-400 font-bold uppercase tracking-widest">Recent Local History</h4>
                    {districtHistory.slice(0, 10).map((h: any) => (
                      <div key={h.id} className="p-3 bg-slate-800 rounded-lg border border-slate-700 text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-slate-200">{h.cause || h.reason}</span>
                          <span className="text-xs text-slate-500">{new Date(h.startTime || h.start_time).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-400">Severity: {h.severity}</p>
                      </div>
                    ))}
                    {districtHistory.length === 0 && (
                      <p className="text-xs text-slate-500 italic py-4">No recent history logged in our database for {selectedDistrict}.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Feed</h3>
                  <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                  {feed.slice(0, 20).map(f => (
                    <div key={f.id} className={`border-l-2 ${feedColor(f.type)} pl-3 py-1.5`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {feedIcon(f.type)}
                        <span className="text-xs font-semibold text-slate-200">{f.area}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{f.message}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{new Date(f.timestamp).toLocaleTimeString()}</p>
                    </div>
                  ))}
                  {feed.length === 0 && <p className="text-xs text-slate-600 text-center py-8">No events yet</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analytics */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">National Grid Insights</h2>
            <Link href="/history" className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">View Full History →</Link>
          </div>
          <AnalyticsDashboard />
        </section>

        {/* Emergency Contacts Banner */}
        <section className="bg-gradient-to-r from-red-500/10 to-amber-500/10 border border-red-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Phone className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="font-bold text-white">Emergency Hotline</h3>
              <p className="text-sm text-slate-400">Electric Emergency: <span className="text-white font-bold">939</span> | Dispatch: <span className="text-white">+251-XXX-XXXX</span></p>
            </div>
          </div>
          <Link href="/contact" className="px-5 py-2.5 bg-red-500/20 text-red-300 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors border border-red-500/30">
            All Contacts
          </Link>
        </section>
      </main>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Report Power Outage</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Area / Location</label>
                <input value={reportForm.area} onChange={e => setReportForm({ ...reportForm, area: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:border-blue-500 outline-none" placeholder="e.g. Bole, Addis Ababa" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Severity</label>
                <select value={reportForm.severity} onChange={e => setReportForm({ ...reportForm, severity: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none">
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="critical">Critical</option>
                  <option value="grid_failure">Grid Failure</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description (optional)</label>
                <textarea value={reportForm.description} onChange={e => setReportForm({ ...reportForm, description: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:border-blue-500 outline-none resize-none h-20" placeholder="Describe the outage..." />
              </div>
              {reportStatus && <p className="text-sm text-center">{reportStatus}</p>}
              <button onClick={handleReport} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors">
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSubscribeModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Subscribe to Outage Alerts</h2>
                <p className="text-xs text-slate-500">Get email notifications for your area</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Name</label>
                <input value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:border-blue-500 outline-none" placeholder="Your name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                <input type="email" value={subForm.email} onChange={e => setSubForm({ ...subForm, email: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:border-blue-500 outline-none" placeholder="your@email.com" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Area (for alerts)</label>
                <select value={subForm.area} onChange={e => setSubForm({ ...subForm, area: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-blue-500 outline-none">
                  <option value="">Select your area...</option>
                  <option value="Bole">Bole</option>
                  <option value="Yeka">Yeka</option>
                  <option value="Arada">Arada</option>
                  <option value="Kirkos">Kirkos</option>
                  <option value="Lideta">Lideta</option>
                  <option value="Gulele">Gulele</option>
                  <option value="Kolfe Keranio">Kolfe Keranio</option>
                  <option value="Nifas Silk-Lafto">Nifas Silk-Lafto</option>
                  <option value="Akaki Kaliti">Akaki Kaliti</option>
                  <option value="Addis Ketema">Addis Ketema</option>
                  <option value="Piassa">Piassa</option>
                  <option value="Merkato">Merkato</option>
                  <option value="Kazanchis">Kazanchis</option>
                  <option value="Sarbet">Sarbet</option>
                  <option value="Megenagna">Megenagna</option>
                  <option value="CMC">CMC</option>
                  <option value="Ayat">Ayat</option>
                  <option value="Bahir Dar">Bahir Dar</option>
                  <option value="Hawassa">Hawassa</option>
                  <option value="Dire Dawa">Dire Dawa</option>
                  <option value="Adama">Adama</option>
                  <option value="Jimma">Jimma</option>
                  <option value="Mekelle">Mekelle</option>
                  <option value="Gondar">Gondar</option>
                </select>
              </div>
              {subStatus && <p className="text-sm text-center">{subStatus}</p>}
              <button onClick={handleSubscribe} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors">
                Subscribe to Alerts
              </button>
              <p className="text-[10px] text-slate-600 text-center">Powered by Vercel Serverless and Resend EMail SDK</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© 2026 GridGuard Ethiopia — Ethiopian Electric Utility</p>
          <div className="flex gap-6">
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/feedback" className="hover:text-white transition-colors">Feedback</Link>
            <Link href="/history" className="hover:text-white transition-colors">Outage History</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
