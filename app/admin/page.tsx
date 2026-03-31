"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Users, FileText, MapPin, BarChart3, LogOut, PlusCircle, RefreshCw, Globe, AlertTriangle, Wrench } from "lucide-react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [token, setToken] = useState("");
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Forms
  const [staffForm, setStaffForm] = useState({ username: "", password: "", name: "", role: "maintenance", email: "" });
  const [contentForm, setContentForm] = useState({ type: "blog", title: "", body: "" });
  const [formStatus, setFormStatus] = useState("");

  useEffect(() => {
    const u = localStorage.getItem("gridguard_user");
    if (!u) { router.push("/admin/login"); return; }
    const parsed = JSON.parse(u);
    if (parsed.role !== "admin") { router.push("/admin/login"); return; }
    setUser(parsed);
    // Token is usually in HTTP-only cookie now, but we check local storage for compatibility
    setToken(localStorage.getItem("gridguard_token") || "");
  }, [router]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/admin", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 15000); return () => clearInterval(i); }, [fetchData]);

  const handleCreateStaff = async () => {
    if (!staffForm.username || !staffForm.password || !staffForm.name) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "create_staff", ...staffForm }),
      });
      const d = await res.json();
      if (d.success) {
        setFormStatus("Success: Staff account created!");
        setStaffForm({ username: "", password: "", name: "", role: "maintenance", email: "" });
        fetchData();
        setTimeout(() => setFormStatus(""), 3000);
      } else setFormStatus(`Error: ${d.error}`);
    } catch { setFormStatus("❌ Failed"); }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this staff account? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete_staff", staffId: id }),
      });
      const d = await res.json();
      if (d.success) {
        setFormStatus("Staff member removed.");
        fetchData();
      } else setFormStatus(`Error: ${d.error}`);
    } catch { setFormStatus("❌ Delete failed"); }
  };

  const handleAddContent = async () => {
    if (!contentForm.title || !contentForm.body) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "add_content", ...contentForm }),
      });
      const d = await res.json();
      if (d.success) {
        setFormStatus("Success: Content published!");
        setContentForm({ type: "blog", title: "", body: "" });
        fetchData();
        setTimeout(() => setFormStatus(""), 3000);
      } else setFormStatus(`Error: ${d.error}`);
    } catch { setFormStatus("Error: Failed"); }
  };

  const triggerCrawl = async () => {
    setFormStatus("Running EEU crawler...");
    try {
      const res = await fetch("/api/cron/eeu-sync");
      const d = await res.json();
      if (d.success) {
        setFormStatus(`Success: Crawl complete! ${d.newEntries} new entries, ${d.notificationsSent} notifications sent.`);
        fetchData();
      } else setFormStatus(`Error: ${d.error}`);
    } catch { setFormStatus("Error: Crawler failed"); }
  };

  if (!user || loading) return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const sidebarItems = [
    { key: "overview", icon: <BarChart3 className="w-5 h-5" />, label: "Overview" },
    { key: "staff", icon: <Users className="w-5 h-5" />, label: "Staff Management" },
    { key: "reports", icon: <MapPin className="w-5 h-5" />, label: "Report Clusters" },
    { key: "content", icon: <FileText className="w-5 h-5" />, label: "Content" },
    { key: "eeu", icon: <Globe className="w-5 h-5" />, label: "EEU Data" },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm">Admin Panel</span>
            <span className="block text-[10px] text-slate-500 uppercase tracking-wider">{user.name}</span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItems.map(item => (
            <button key={item.key} onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === item.key ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent"}`}>
              {item.icon}{item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); localStorage.removeItem("gridguard_user"); router.push("/staff/login"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-auto">
        <header className="h-14 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-6">
          <h1 className="text-sm font-semibold text-slate-300">{sidebarItems.find(s => s.key === activeTab)?.label}</h1>
          <button onClick={fetchData} className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </header>

        <div className="flex-1 p-6 space-y-6">
          {formStatus && <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-center">{formStatus}</div>}

          {/* Overview */}
          {activeTab === "overview" && data?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Total Staff", value: data.stats.totalStaff, color: "blue" },
                { label: "Active Outages", value: data.stats.activeOutages, color: "red" },
                { label: "Total Reports", value: data.stats.totalReports, color: "amber" },
                { label: "Subscribers", value: data.stats.totalSubscribers, color: "green" },
                { label: "EEU Interruptions", value: data.stats.eeuInterruptions, color: "purple" },
                { label: "Content Items", value: data.stats.contentItems, color: "cyan" },
              ].map(s => (
                <div key={s.label} className={`bg-slate-800/50 border border-slate-700/50 rounded-xl p-4`}>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Staff Management */}
          {activeTab === "staff" && (
            <div className="max-w-lg space-y-4">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><PlusCircle className="w-4 h-4 text-blue-400" /> Create Staff Account</h3>
                <div className="space-y-3">
                  <input value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none" placeholder="Full Name" />
                  <input value={staffForm.username} onChange={e => setStaffForm({ ...staffForm, username: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none" placeholder="Username" />
                  <input type="password" value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none" placeholder="Password" />
                  <input type="email" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none" placeholder="Email (optional)" />
                  <select value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none">
                    <option value="admin">Admin</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="support">Support</option>
                    <option value="field_staff">Field Staff</option>
                  </select>
                  <button onClick={handleCreateStaff} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-sm">Create Account</button>
                </div>
              </div>
              {/* Current staff */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                  Registered Staff ({data?.stats?.totalStaff || 0})
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                  {data?.staffList?.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700/30 rounded-xl group transition-all hover:bg-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-blue-400">
                          {s.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{s.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{s.role} • {s.username}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteStaff(s.id)}
                        className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10"
                        title="Delete staff account"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!data?.staffList || data.staffList.length === 0) && (
                    <p className="text-center text-xs text-slate-600 py-6 italic">No staff members found.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Report Clusters */}
          {activeTab === "reports" && (
            <div className="space-y-3">
              {data?.reportClusters && Object.entries(data.reportClusters).map(([area, cluster]: [string, any]) => (
                <div key={area} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${cluster.priority === 'critical' ? 'bg-red-500 animate-pulse' : cluster.priority === 'high' ? 'bg-amber-500' : cluster.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-500'}`} />
                    <div>
                      <h4 className="text-sm font-semibold text-white">{area}</h4>
                      <p className="text-xs text-slate-500">{cluster.count} reports • Priority: {cluster.priority}</p>
                    </div>
                  </div>
                </div>
              ))}
              {(!data?.reportClusters || Object.keys(data.reportClusters).length === 0) && (
                <p className="text-center text-slate-600 py-12">No citizen reports yet</p>
              )}
            </div>
          )}

          {/* Content */}
          {activeTab === "content" && (
            <div className="max-w-lg space-y-4">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-green-400" /> Add Content</h3>
                <div className="space-y-3">
                  <select value={contentForm.type} onChange={e => setContentForm({ ...contentForm, type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none">
                    <option value="blog">Blog Post</option>
                    <option value="safety_guide">Safety Guide</option>
                    <option value="news">Electricity News</option>
                    <option value="alert">Outage Alert</option>
                  </select>
                  <input value={contentForm.title} onChange={e => setContentForm({ ...contentForm, title: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none" placeholder="Title" />
                  <textarea value={contentForm.body} onChange={e => setContentForm({ ...contentForm, body: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none resize-none h-28" placeholder="Content body..." />
                  <button onClick={handleAddContent} className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors text-sm">Publish Content</button>
                </div>
              </div>
            </div>
          )}

          {/* EEU Data */}
          {activeTab === "eeu" && (
            <div className="space-y-4">
              <button onClick={triggerCrawl} className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
                <Globe className="w-4 h-4" /> Run EEU Crawler Now
              </button>
              <div className="space-y-3">
                {(Array.isArray(data?.eeuData) ? data.eeuData : []).map((item: any) => (
                  <div key={item.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-white">{item.subcity}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded ${item.active ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {item.active ? 'Active' : 'Resolved'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">{item.reason}</p>
                    <div className="flex gap-3 text-[11px] text-slate-500">
                      <span>Date: {new Date(item.fetchedAt).toLocaleDateString()}</span>
                      <span>District: {item.district}</span>
                      {item.translatedFrom && <span>Translated from Amharic</span>}
                    </div>
                  </div>
                ))}
                {(!data?.eeuData || data.eeuData.length === 0) && (
                  <p className="text-center text-slate-600 py-12">No EEU data yet. Click "Run EEU Crawler" to fetch.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
