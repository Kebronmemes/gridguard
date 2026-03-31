"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Circle, Popup, useMapEvents, LayerGroup } from "react-leaflet";
import type { Outage } from "@/lib/types";

const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

interface Prediction {
  id: number;
  location: string;
  lat: number;
  lng: number;
  risk_level: 'low' | 'medium' | 'high';
  confidence_score: number;
  predicted_time_window: string;
  reason_summary: string;
  source: 'rule' | 'ai';
}

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
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [clickedPos, setClickedPos] = useState<[number, number] | null>(null);
  const [quickForm, setQuickForm] = useState({ area: '', reason: '', type: 'emergency', severity: 'critical' });
  const [status, setStatus] = useState('');

  useEffect(() => { setIsMounted(true); }, []);

  const fetchOutages = useCallback(async () => {
    try { const res = await fetch('/api/outages'); const data = await res.json(); setOutages(data.outages || []); } catch {}
  }, []);

  const filteredOutages = useMemo(() => {
    const seen = new Set();
    return outages.filter(o => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      const area = o.area?.toLowerCase().replace(/\s+/g, '') || '';
      return !(area === 'addisababa' || area === 'addisabeaba');
    });
  }, [outages]);

  const fetchPredictions = useCallback(async () => {
    try { const res = await fetch('/api/predictions'); const data = await res.json(); setPredictions(data.predictions || []); } catch {}
  }, []);

  useEffect(() => {
    fetchOutages(); fetchPredictions();
    const i = setInterval(fetchOutages, 10000);
    const p = setInterval(fetchPredictions, 60000);
    return () => { clearInterval(i); clearInterval(p); };
  }, [fetchOutages, fetchPredictions]);

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

        {filteredOutages.map(o => {
          const radiusMap: Record<string, number> = { low: 1000, moderate: 2000, critical: 3500, grid_failure: 6000 };
          const baseRadius = radiusMap[o.severity] || 2000;
          const color = SEVERITY_COLORS[o.severity] || '#ef4444';
          const gradId = `grad-${o.severity}`;

          if (!o.coordinates) return null;

          const popupContent = (
            <Popup>
              <div className="font-sans min-w-[240px] p-4 text-white">
                <div className="flex flex-col gap-1 mb-3 border-b border-slate-700/50 pb-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{TYPE_LABELS[o.type] || o.type}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${o.status === 'active' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {o.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-xl leading-tight mt-1">{o.area}</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 shadow-inner">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Reason / Cause
                    </p>
                    <p className="text-slate-200 text-sm font-semibold">{o.reason || 'EEU Power Interruption'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/30 p-2 rounded-lg border border-slate-700/30">
                      <p className="text-[9px] text-slate-500 font-bold uppercase">Severity</p>
                      <p className="text-xs font-black mt-0.5" style={{ color: color }}>
                        {o.severity.toUpperCase()}
                      </p>
                    </div>
                    <div className="bg-slate-800/30 p-2 rounded-lg border border-slate-700/30">
                      <p className="text-[9px] text-slate-500 font-bold uppercase">Staff Hub ID</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate italic">
                        {o.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11px] text-slate-400 bg-slate-900/40 p-2.5 rounded-lg">
                    <div className="flex justify-between font-bold text-slate-300">
                      <span>Restore ETA</span>
                      <span className="text-blue-400">{new Date(o.estimatedRestoreTime).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                    </div>
                    {(o as any).etaLabel && (
                      <div className="text-amber-400/80 text-[10px] italic pt-0.5">{(o as any).etaLabel}</div>
                    )}
                  </div>

                  {o.verifiedByStaff && (
                    <div className="flex items-center gap-2 text-green-400 text-[10px] font-black bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20 w-fit">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                      OFFICIAL STAFF VERIFIED
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          );

          return (
            <LayerGroup key={o.id}>
              {/* 1. Rippling Outer Rings */}
              <Circle 
                center={o.coordinates as [number, number]} 
                radius={baseRadius} 
                pathOptions={{ 
                  fillOpacity: 0.05, 
                  fillColor: color, 
                  color: color, 
                  weight: 1, 
                  dashArray: '5 10',
                  className: `radar-ripple pulse-${o.severity}`
                }}
              >
                {popupContent}
              </Circle>

              {/* 2. Middle Pulsing Halo */}
              <Circle 
                center={o.coordinates as [number, number]} 
                radius={baseRadius * 0.6} 
                pathOptions={{ 
                  fillOpacity: 0.15, 
                  fillColor: color, 
                  weight: 0,
                  className: `radar-pulse-${o.severity === 'critical' ? 'fast' : 'slow'} pulse-${o.severity}`
                }}
              >
                {popupContent}
              </Circle>

              {/* 3. The Sonar Sweep */}
              <Circle 
                center={o.coordinates as [number, number]} 
                radius={baseRadius * 0.8} 
                pathOptions={{ 
                  fillOpacity: 0, 
                  color: color, 
                  weight: 2, 
                  dashArray: '1 3000',
                  className: 'radar-sweep'
                }}
              >
                {popupContent}
              </Circle>
              
              {/* 4. Solid Core */}
              <Circle 
                center={o.coordinates as [number, number]} 
                radius={baseRadius * 0.12} 
                pathOptions={{ 
                  fillOpacity: 1, 
                  fillColor: `url(#${gradId})`, 
                  weight: 2,
                  color: color
                }}
              >
                {popupContent}
              </Circle>
            </LayerGroup>
          );
        })}

        {/* ── PREDICTION RISK LAYER ── */}
        {predictions
          .filter(p => p.lat && p.lng)
          .map(p => {
            const rColor = RISK_COLORS[p.risk_level] || '#22c55e';
            const rRadius = p.risk_level === 'high' ? 4500 : p.risk_level === 'medium' ? 3000 : 2000;
            return (
              <Circle
                key={`pred-${p.id}`}
                center={[p.lat, p.lng]}
                radius={rRadius}
                pathOptions={{ fillColor: rColor, fillOpacity: 0.04, color: rColor, weight: 0.5, dashArray: '3 12' }}
              >
                <Popup>
                  <div className="font-sans min-w-[180px] p-2">
                    <p className="text-[10px] font-bold uppercase" style={{ color: rColor }}>⚠ Risk: {p.risk_level}</p>
                    <h4 className="font-bold text-sm">{p.location.replace(' (AI)', '')}</h4>
                    <p className="text-[10px] text-slate-500 mt-1">🕐 {p.predicted_time_window}</p>
                    <p className="text-[10px] text-slate-500">📊 Confidence: {p.confidence_score}%</p>
                    <p className="text-[9px] text-slate-600 italic mt-1">{p.reason_summary}</p>
                  </div>
                </Popup>
              </Circle>
            );
          })
        }

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
          <p>📡 Radars: {outages.length}</p>
          <p>🔴 Critical: {outages.filter(o => o.severity === 'critical').length}</p>
          <p>⚠️ Risk zones: {predictions.length}</p>
        </div>
      </div>
    </>
  );
}
