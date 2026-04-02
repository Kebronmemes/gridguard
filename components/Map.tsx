"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Circle, Popup, useMap, LayerGroup, Marker } from "react-leaflet";
import { Zap, CloudRain, CloudLightning } from "lucide-react";
import type { Outage } from "@/lib/types";
import L from 'leaflet';
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
  const [infrastructure, setInfrastructure] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(true);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    fetch('/api/infrastructure').then(r => r.json()).then(d => setInfrastructure(d.infrastructure || []));
  }, []);

  const getInfraIcon = (type: string) => {
    if (typeof window === 'undefined') return L.divIcon({});
    const color = type === 'hospital' ? '#ef4444' : type === 'school' ? '#3b82f6' : '#94a3b8';
    return L.divIcon({
      html: `<div style="background: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}"></div>`,
      className: 'custom-infra-icon',
      iconSize: [12, 12],
    });
  };

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
      
      // Strict filter for generic city-wide "Addis Ababa"
      const isGeneric = area === 'addisababa' || area === 'addisabeba' ||
                         district === 'addisababa' || district === 'addisabeba';
                         
      if (isGeneric) return false;
      
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

      {/* Infrastructure Markers */}
      {infrastructure.map(infra => (
        <Marker 
          key={`infra-${infra.id}`} 
          position={[infra.lat, infra.lng]} 
          icon={getInfraIcon(infra.type)}
        >
          <Popup className="premium-popup">
            <div className="text-slate-200">
               <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">{infra.type}</div>
               <div className="font-bold text-sm">{infra.name}</div>
               <div className="text-[10px] text-slate-400 mt-2 italic">Critical Infrastructure Point</div>
            </div>
          </Popup>
        </Marker>
      ))}

      {filteredOutages.map(o => {
        const radiusMap: Record<string, number> = { low: 15, moderate: 30, critical: 50, grid_failure: 100 };
        const baseRadius = radiusMap[o.severity] || 30;
        const color = SEVERITY_COLORS[o.severity] || '#ef4444';
        const gradId = `grad-${o.severity}`;

        if (!o.coordinates || !Array.isArray(o.coordinates) || o.coordinates.length < 2) return null;

        return (
          <Circle 
            key={o.id}
            center={o.coordinates as [number, number]} 
            radius={baseRadius * 15} // Increase radius for "vicinity" effect
            pathOptions={{ 
              fillOpacity: 0.15, 
              fillColor: `url(#${gradId})`, 
              color: color, 
              weight: 1, 
              className: 'radar-pulse-effect'
            }}
          >
            <Popup className="premium-popup">
              <div className="font-sans min-w-[260px] p-0 overflow-hidden">
                <div className="bg-slate-900/90 p-4 border-b border-slate-700/50">
                  <div className="flex items-center justify-between mb-1">
                     <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Addis Ababa Outage</span>
                     <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-${o.severity === 'critical' ? 'red' : 'amber'}-500/10 text-${o.severity === 'critical' ? 'red' : 'amber'}-400`}>
                       {o.severity}
                     </span>
                  </div>
                  <h3 className="font-bold text-white text-xl leading-tight">{o.area}</h3>
                  <p className="text-xs text-slate-400 mt-1">{o.reason || 'Planned Maintenance'}</p>
                </div>
                
                <div className="p-4 space-y-4 bg-slate-900/40">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Start Time</span>
                      <div className="text-slate-200 text-xs font-medium">
                        {new Date(o.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <div className="text-[10px] text-slate-500">{new Date(o.startTime).toLocaleDateString([], { day: 'numeric', month: 'short' })}</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-blue-500 uppercase font-bold tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"/> End Time
                      </span>
                      <div className="text-blue-400 text-xs font-medium">
                        {o.estimatedRestoreTime ? new Date(o.estimatedRestoreTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                        <div className="text-[10px] text-blue-500/70">{o.estimatedRestoreTime ? new Date(o.estimatedRestoreTime).toLocaleDateString([], { day: 'numeric', month: 'short' }) : '--'}</div>
                      </div>
                    </div>
                  </div>

                  {o.weather && o.weather.condition !== 'Unknown' && (
                    <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/30 flex items-center gap-3">
                       <CloudRain className="w-4 h-4 text-cyan-400" />
                       <div className="flex-1">
                         <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Weather Status</p>
                         <p className="text-[11px] text-slate-300 font-medium">{o.weather.condition} • {o.weather.wind} km/h</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Circle>
        );
      })}

      {/* ── PREDICTION RISK LAYER (WEATHER + HISTORY) ────────────────────── */}
      {showPredictions && predictions
        .filter(p => p.lat && p.lng)
        .map(p => {
          const rColor = RISK_COLORS[p.risk_level] || '#06b6d4';
          const rRadius = p.risk_level === 'high' ? 2000 : p.risk_level === 'medium' ? 1200 : 800;
          
          const isWeatherRisk = p.weather_impact?.toLowerCase().includes('rain') || 
                              p.weather_impact?.toLowerCase().includes('storm') ||
                              p.reason_summary?.toLowerCase().includes('weather');

          // Weather Icon Marker
          const weatherIcon = isWeatherRisk ? L.divIcon({
            html: `<div class="floating-cloud text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19c.7 0 1.3-.2 1.9-.6a3.5 3.5 0 0 0 1.1-4.8c-.5-.7-1-1.3-1.6-1.8A7 7 0 1 0 5 13.5c0 1.2.4 2.2 1.1 3.1.5.5 1 1 1.6 1.4a3.5 3.5 0 0 0 4.8 1.1c.4-.3.7-.7.9-1.1.2.4.5.8.9 1.1.6.4 1.2.6 1.9.6Z"/><path d="M8 14v4"/><path d="M12 14v6"/><path d="M16 14v4"/></svg>
                  </div>`,
            className: 'bg-transparent border-none',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          }) : null;

          return (
            <LayerGroup key={`pred-${p.id || p.location}`}>
              <Circle
                center={[p.lat, p.lng]}
                radius={rRadius}
                pathOptions={{
                  fillColor: rColor,
                  fillOpacity: 0.2,
                  color: rColor,
                  weight: 1,
                  dashArray: '3 6',
                  className: 'radar-slow-blink'
                }}
              >
                <Popup>
                  <div className="font-sans min-w-[240px] p-4">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: rColor }}>
                         {isWeatherRisk ? '⛈ Weather Risk' : '📊 Historical Risk'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={{ background: rColor + '22', color: rColor }}>
                        {p.probability || 0}% PROB
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-lg mb-2">{p.location.replace(' (AI)', '').replace(' (AI Analysis)', '')}</h3>
                    
                    <div className="space-y-2">
                      {p.weather_impact && (
                        <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/50 flex items-center gap-2">
                           <CloudRain className="w-4 h-4 text-cyan-400" />
                           <div>
                             <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Live Weather Severity</p>
                             <p className="text-sm font-semibold text-cyan-300">{p.weather_impact}</p>
                           </div>
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

              {/* Weather Cloud Visual Effect */}
              {weatherIcon && (
                <Marker position={[p.lat, p.lng]} icon={weatherIcon} interactive={false} />
              )}
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
