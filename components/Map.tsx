"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Polygon, Circle, Popup, useMap, LayerGroup } from "react-leaflet";
import type { Outage } from "@/lib/types";

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

  useEffect(() => { setIsMounted(true); }, []);

  const fetchOutages = useCallback(async () => {
    try {
      const res = await fetch('/api/outages');
      const data = await res.json();
      setOutages(data.outages || []);
    } catch (e) { console.error('Map fetch error', e); }
  }, []);

  useEffect(() => {
    fetchOutages();
    const interval = setInterval(fetchOutages, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchOutages]);

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

      <MapController flyTo={flyTo || null} outages={outages} />

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

      {outages.map(o => {
        const radiusMap: Record<string, number> = { low: 1000, moderate: 2000, critical: 3500, grid_failure: 6000 };
        const baseRadius = radiusMap[o.severity] || 2000;
        const color = SEVERITY_COLORS[o.severity] || '#ef4444';

        if (!o.coordinates || !Array.isArray(o.coordinates) || o.coordinates.length < 2) return null;

        return (
          <LayerGroup key={o.id}>
            {/* Inner opaque core */}
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
                      <p>Started: {new Date(o.startTime).toLocaleString()}</p>
                      <p className="font-medium text-slate-700">Restore ETA: {new Date(o.estimatedRestoreTime).toLocaleString()}</p>
                    </div>

                    {o.verifiedByStaff && (
                      <div className="flex items-center gap-1.5 text-green-600 text-[10px] font-bold bg-green-50 px-2 py-1 rounded-full w-fit">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        VERIFIED BY EEU STAFF
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Circle>
            
            {/* Middle band */}
            <Circle center={o.coordinates as [number, number]} radius={baseRadius * 0.5} pathOptions={{ fillOpacity: 0.3, fillColor: color, weight: 0 }} />
            
            {/* Outer diffuse halo */}
            <Circle center={o.coordinates as [number, number]} radius={baseRadius} pathOptions={{ fillOpacity: 0.1, fillColor: color, color: color, weight: 1, dashArray: '4 6' }} />
          </LayerGroup>
        );
      })}
    </MapContainer>
  );
}
