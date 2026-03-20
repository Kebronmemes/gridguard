"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Circle, Popup, useMapEvents, LayerGroup } from "react-leaflet";
import type { Outage } from "@/lib/types";

const ADDIS_ABABA: [number, number] = [9.0, 38.75];
const SEVERITY_COLORS: Record<string, string> = {
  low: '#3b82f6', moderate: '#f59e0b', critical: '#ef4444', grid_failure: '#7c2d12',
};
const TYPE_LABELS: Record<string, string> = {
  emergency: 'Emergency', planned: 'Planned', maintenance: 'Maintenance',
  load_shedding: 'Load Shedding', technical_fault: 'Technical Fault',
};

function ClickHandler({ onMapClick }: { onMapClick: (pos: [number, number]) => void }) {
  useMapEvents({ click(e) { onMapClick([e.latlng.lat, e.latlng.lng]); } });
  return null;
}

export default function StaffInteractiveMap({ token, onRefresh }: { token: string; onRefresh: () => void }) {
  const [isMounted, setIsMounted] = useState(false);
  const [outages, setOutages] = useState<Outage[]>([]);
  const [clickedPos, setClickedPos] = useState<[number, number] | null>(null);
  const [quickForm, setQuickForm] = useState({ area: '', reason: '', type: 'emergency', severity: 'critical' });
  const [status, setStatus] = useState('');

  useEffect(() => { setIsMounted(true); }, []);

  const fetchOutages = useCallback(async () => {
    try { const res = await fetch('/api/outages'); const data = await res.json(); setOutages(data.outages || []); } catch {}
  }, []);

  useEffect(() => { fetchOutages(); const i = setInterval(fetchOutages, 10000); return () => clearInterval(i); }, [fetchOutages]);

  const handleQuickCreate = async () => {
    if (!quickForm.area || !clickedPos) return;
    try {
      const res = await fetch('/api/staff/outages', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...quickForm, coordinates: clickedPos }),
      });
      const data = await res.json();
      if (data.success) { setStatus('Success: Created!'); setClickedPos(null); onRefresh(); fetchOutages(); setTimeout(() => setStatus(''), 2000); }
      else { setStatus(`Error: ${data.error}`); }
    } catch { setStatus('Error: Failed'); }
  };

  if (!isMounted) return <div className="h-full w-full bg-slate-900 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <>
      <MapContainer center={ADDIS_ABABA} zoom={13} className="w-full h-full z-0" zoomControl={true}>
        <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <ClickHandler onMapClick={setClickedPos} />

        <svg width="0" height="0">
          <defs>
            <radialGradient id="grad-critical"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" /></radialGradient>
            <radialGradient id="grad-moderate"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" /><stop offset="100%" stopColor="#f59e0b" stopOpacity="0" /></radialGradient>
            <radialGradient id="grad-low"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" /><stop offset="100%" stopColor="#3b82f6" stopOpacity="0" /></radialGradient>
            <radialGradient id="grad-grid_failure"><stop offset="0%" stopColor="#7c2d12" stopOpacity="0.9" /><stop offset="100%" stopColor="#7c2d12" stopOpacity="0.1" /></radialGradient>
          </defs>
        </svg>

        {outages.map(o => {
          const radiusMap: Record<string, number> = { low: 1000, moderate: 2000, critical: 3500, grid_failure: 6000 };
          const baseRadius = radiusMap[o.severity] || 2000;
          const color = SEVERITY_COLORS[o.severity] || '#ef4444';

          if (!o.coordinates) return null;

          return (
            <LayerGroup key={o.id}>
              {/* Radar Effect Circles */}
              <Circle center={o.coordinates as [number, number]} radius={baseRadius * 0.15} pathOptions={{ fillOpacity: 0.9, fillColor: color, weight: 0 }}>
                <Popup>
                  <div className="font-sans min-w-[220px] p-2">
                    <div className="flex flex-col gap-1 mb-3 border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{TYPE_LABELS[o.type] || o.type}</span>
                      <h3 className="font-bold text-slate-900 text-lg leading-tight">{o.area}</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Reason / Cause</p>
                        <p className="text-slate-800 text-sm font-medium">{o.reason || 'EEU Power Interruption'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-400 font-medium">Status</p>
                          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded font-semibold ${o.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {o.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div>
                          <p className="text-slate-400 font-medium">Severity</p>
                          <span className="inline-block mt-0.5 font-bold" style={{ color: color }}>
                            {o.severity.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 mt-2">
                        <p>ID: {o.id}</p>
                        <p className="font-medium text-slate-700">Restore ETA: {new Date(o.estimatedRestoreTime).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Circle>
              <Circle center={o.coordinates as [number, number]} radius={baseRadius * 0.5} pathOptions={{ fillOpacity: 0.3, fillColor: color, weight: 0 }} />
              <Circle center={o.coordinates as [number, number]} radius={baseRadius} pathOptions={{ fillOpacity: 0.1, fillColor: color, color: color, weight: 1, dashArray: '4 6' }} />
            </LayerGroup>
          );
        })}

        {clickedPos && (
          <Circle center={clickedPos} radius={150} pathOptions={{ color: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.3, weight: 3, dashArray: '4 4' }}>
            <Popup>
              <div className="min-w-[200px] font-sans p-1">
                <h4 className="font-bold text-sm border-b pb-1 mb-2">Quick Outage Report</h4>
                <input value={quickForm.area} onChange={e => setQuickForm({ ...quickForm, area: e.target.value })}
                  placeholder="Area name" className="w-full px-2 py-1.5 border rounded text-xs mb-1.5 outline-none text-slate-900" />
                <input value={quickForm.reason} onChange={e => setQuickForm({ ...quickForm, reason: e.target.value })}
                  placeholder="Reason / cause" className="w-full px-2 py-1.5 border rounded text-xs mb-1.5 outline-none text-slate-900" />
                <select value={quickForm.severity} onChange={e => setQuickForm({ ...quickForm, severity: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-xs mb-2 outline-none text-slate-900">
                  <option value="low">Low</option><option value="moderate">Moderate</option><option value="critical">Critical</option><option value="grid_failure">Grid Failure</option>
                </select>
                {status && <p className="text-xs text-center mb-1 text-slate-600">{status}</p>}
                <button onClick={handleQuickCreate} className="w-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-2 rounded transition-colors">Confirm Outage</button>
              </div>
            </Popup>
          </Circle>
        )}
      </MapContainer>

      <div className="absolute top-3 right-3 z-[400] bg-slate-900/90 backdrop-blur border border-slate-700/50 rounded-xl p-3 max-w-[180px]">
        <h3 className="text-xs font-bold text-slate-300 mb-1.5">Staff Radar HUD</h3>
        <p className="text-[10px] text-slate-500 mb-2">Click map to pin outage. Radars show impact radius.</p>
        <div className="text-[10px] text-slate-400 space-y-0.5">
          <p>📡 active Radars: {outages.length}</p>
          <p>🔴 Critical: {outages.filter(o => o.severity === 'critical').length}</p>
        </div>
      </div>
    </>
  );
}
