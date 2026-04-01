"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Circle, Popup, useMap, LayerGroup } from "react-leaflet";
import { Zap } from "lucide-react";
import type { Outage } from "@/lib/types";
import 'leaflet/dist/leaflet.css';

const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',       // Green (Safe)
  medium: '#06b6d4',    // Cyan (Moderate storm/risk)
  high: '#8b5cf6',      // Violet (High probability storm risk)
};

interface Prediction {
  id: number;
  location: string;
  lat: number;
  lng: number;
  risk_level: 'low' | 'medium' | 'high';
  confidence_score: number;
  probability: number;
  predicted_time_window: string;
  reason_summary: string;
  source: 'rule' | 'ai';
  weather_impact?: string;
}

const ADDIS_ABABA: [number, number] = [9.0, 38.75];

const SEVERITY_COLORS: Record<string, string> = {
  low: '#3b82f6',
  moderate: '#f59e0b',
  critical: '#ef4444',
  grid_failure: '#7c2d12',
};

const TYPE_LABELS: Record<string, string> = {
  emergency: 'Emergency',
  planned: 'Planned',
  maintenance: 'Maintenance',
  load_shedding: 'Load Shedding',
  technical_fault: 'Technical Fault',
};

function MapController({ flyTo, outages }: { flyTo: [number, number] | null, outages: Outage[] }) {
  const map = useMap();
  const [hasInitialFit, setHasInitialFit] = useState(false);

  useEffect(() => {
    if (flyTo) {
      map.flyTo(flyTo, 15, { duration: 1.5 });
      return;
    }

    if (!hasInitialFit && outages.length > 0) {
      let minLat = 90;
      let maxLat = -90;
      let minLng = 180;
      let maxLng = -180;
      let hasValidCoords = false;

      outages.forEach(o => {
        if (o.coordinates) {
          minLat = Math.min(minLat, o.coordinates[0]);
          maxLat = Math.max(maxLat, o.coordinates[0]);
          minLng = Math.min(minLng, o.coordinates[1]);
          maxLng = Math.max(maxLng, o.coordinates[1]);
          hasValidCoords = true;
        }
        if (o.polygon) {
          o.polygon.forEach(coord => {
            minLat = Math.min(minLat, coord[0]);
            maxLat = Math.max(maxLat, coord[0]);
            minLng = Math.min(minLng, coord[1]);
            maxLng = Math.max(maxLng, coord[1]);
            hasValidCoords = true;
          });
        }
      });

      if (hasValidCoords) {
        map.fitBounds([
          [minLat - 0.02, minLng - 0.02],
          [maxLat + 0.02, maxLng + 0.02]
        ], { padding: [50, 50], maxZoom: 14, duration: 1.5 });
        setHasInitialFit(true);
      }
    } else if (!hasInitialFit && outages.length === 0) {
        // Still waiting for outages or there are none. We can leave it centered on ADDIS_ABABA (set by MapContainer defaults)
    }
  }, [flyTo, outages, map, hasInitialFit]);
  
  return null;
}

export default function InteractiveMap({ flyTo }: { flyTo?: [number, number] | null }) {
  const [isMounted, setIsMounted] = useState(false);
  const [outages, setOutages] = useState<Outage[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(true);

  useEffect(() => { setIsMounted(true); }, []);

  const fetchOutages = useCallback(async () => {
    try {
      const res = await fetch('/api/outages');
      const data = await res.json();
      setOutages(data.outages || []);
      // Cache for offline use
      try { localStorage.setItem('gg_outages_cache', JSON.stringify(data.outages || [])); } catch {}
    } catch (e) {
      console.error('Map fetch error', e);
      // Offline fallback
      try {
        const cached = localStorage.getItem('gg_outages_cache');
        if (cached) setOutages(JSON.parse(cached));
      } catch {}
    }
  }, []);

  const fetchPredictions = useCallback(async () => {
    try {
      const res = await fetch('/api/predictions');
      const data = await res.json();
      setPredictions(data.predictions || []);
    } catch (e) { console.error('Predictions fetch error', e); }
  }, []);

  const filteredOutages = useMemo(() => {
    const seen = new Set();
    return outages.filter(o => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      
      const area = o.area?.toLowerCase().replace(/\s+/g, '') || '';
      const district = o.district?.toLowerCase().replace(/\s+/g, '') || '';
      
      // Filter out only if the detailed area itself is explicitly just "Addis Ababa"
      const isAddis = area === 'addisababa' || area === 'addisabeaba';
      if (isAddis) return false;
      
      return true;
    });
  }, [outages]);

  useEffect(() => {
    fetchOutages();
    fetchPredictions();
    const interval = setInterval(fetchOutages, 30000);
    const predInterval = setInterval(fetchPredictions, 60000); // Predictions update less frequently
    return () => { clearInterval(interval); clearInterval(predInterval); };
  }, [fetchOutages, fetchPredictions]);

  if (!isMounted) {
    return (
      <div className="h-full w-full bg-slate-900/5 animate-pulse rounded-xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400 font-medium">Initializing map engine...</span>
        </div>
      </div>
    );
  }

  return (
    <MapContainer center={ADDIS_ABABA} zoom={12} className="w-full h-full rounded-xl z-0" zoomControl={true}>
      <TileLayer
        attribution='&copy; <a href="https://carto.com">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      <MapController flyTo={flyTo || null} outages={filteredOutages} />

      <svg width="0" height="0">
        <defs>
          <radialGradient id="grad-critical">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="grad-moderate">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="grad-low">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="grad-grid_failure">
            <stop offset="0%" stopColor="#7c2d12" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7c2d12" stopOpacity="0.1" />
          </radialGradient>
        </defs>
      </svg>

      {filteredOutages.map(o => {
        const radiusMap: Record<string, number> = { low: 1000, moderate: 2000, critical: 3500, grid_failure: 6000 };
        const baseRadius = radiusMap[o.severity] || 2000;
        const color = SEVERITY_COLORS[o.severity] || '#ef4444';
        const gradId = `grad-${o.severity}`;

        if (!o.coordinates || !Array.isArray(o.coordinates) || o.coordinates.length < 2) return null;

        const popupContent = (
          <Popup>
            <div className="font-sans min-w-[240px] p-4">
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
                    <p className="text-[9px] text-slate-500 font-bold uppercase">Impact Score</p>
                    <p className="text-xs font-black text-white mt-0.5">
                      {Math.round(baseRadius / 100)}/60
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-400 bg-slate-900/40 p-2.5 rounded-lg">
                  <div className="flex justify-between">
                    <span>Started</span>
                    <span className="text-slate-300">{new Date(o.startTime).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                  </div>
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
            {/* 1. Rippling Outer Rings (Dynamic based on severity) */}
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

            {/* 3. The "Sonar" Sweep Line (SVG overlay simulation) */}
            <Circle 
              center={o.coordinates as [number, number]} 
              radius={baseRadius * 0.8} 
              pathOptions={{ 
                fillOpacity: 0, 
                color: color, 
                weight: 2, 
                dashArray: '1 3000', // Creates a single point/line effect
                className: 'radar-sweep'
              }}
            >
              {popupContent}
            </Circle>
            
            {/* 4. Solid High-Intensity Core */}
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

      {/* ── PREDICTION RISK LAYER (WEATHER + HISTORY) ────────────────────── */}
      {/* Cyan/Violet color scheme to differentiate from real outages */}
      {showPredictions && predictions
        .filter(p => p.lat && p.lng)
        .map(p => {
          const rColor = RISK_COLORS[p.risk_level] || '#06b6d4';
          const rRadius = p.risk_level === 'high' ? 4500 : p.risk_level === 'medium' ? 3000 : 2000;
          return (
            <LayerGroup key={`pred-${p.id || p.location}`}>
              {/* Ghost halo — large, very transparent */}
              <Circle
                center={[p.lat, p.lng]}
                radius={rRadius}
                pathOptions={{
                  fillColor: rColor,
                  fillOpacity: p.risk_level === 'high' ? 0.15 : 0.08,
                  color: rColor,
                  weight: 1.5,
                  dashArray: '4 8',
                  className: 'weather-radar-pulse'
                }}
              >
                <Popup>
                  <div className="font-sans min-w-[240px] p-4">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: rColor }}>
                         Weather Risk
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ background: rColor + '22', color: rColor }}>
                        {p.probability || 0}% PROB
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-lg mb-2">{p.location.replace(' (AI)', '')}</h3>
                    
                    <div className="space-y-2">
                      {p.weather_impact && (
                        <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/50">
                           <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Live Weather Severity</p>
                           <p className="text-sm font-semibold text-cyan-300">{p.weather_impact}</p>
                        </div>
                      )}
                      
                      <div className="bg-slate-800/40 p-2 rounded-lg">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Peak Hours:</span>
                          <span className="text-slate-200 font-semibold">{p.predicted_time_window}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 italic">
                          " {p.reason_summary} "
                        </div>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Circle>
            </LayerGroup>
          );
        })
      }

      {/* Prediction toggle button */}
      <div className="leaflet-bottom leaflet-right" style={{ zIndex: 1000 }}>
        <div className="leaflet-control" style={{ margin: '0 10px 40px 0' }}>
          <button
            onClick={() => setShowPredictions(v => !v)}
            style={{
              background: showPredictions ? 'rgba(59,130,246,0.85)' : 'rgba(30,41,59,0.85)',
              border: '1px solid rgba(59,130,246,0.4)',
              color: 'white',
              fontSize: '11px',
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: '8px',
              backdropFilter: 'blur(8px)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Zap className={`w-4 h-4 ${showPredictions ? 'text-blue-400' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">
              {showPredictions ? 'Risk ON' : 'Risk OFF'}
            </span>
          </button>
        </div>
      </div>
    </MapContainer>
  );
}
