"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Polygon, Circle, Popup, useMap } from "react-leaflet";
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
    const interval = setInterval(fetchOutages, 10000); // refresh every 10s
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

        return (
        <div key={o.id}>
          {/* Inner opaque core */}
          <Circle center={o.coordinates} radius={baseRadius * 0.15} pathOptions={{ fillOpacity: 0.9, fillColor: color, weight: 0 }}>
            <Popup>
              <div className="font-sans min-w-[220px] p-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900 text-base">{o.area}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: color + '20', color: color }}>
                    {o.severity.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="text-slate-600"><span className="font-medium text-slate-800">Type:</span> {TYPE_LABELS[o.type] || o.type}</p>
                  <p className="text-slate-600"><span className="font-medium text-slate-800">Cause:</span> {o.reason}</p>
                  <p className="text-slate-600"><span className="font-medium text-slate-800">Reports:</span> {o.reportCount} people affected</p>
                  <p className="text-slate-600"><span className="font-medium text-slate-800">Started:</span> {new Date(o.startTime).toLocaleTimeString()}</p>
                  <p className="text-slate-600"><span className="font-medium text-slate-800">ETA Restore:</span> {new Date(o.estimatedRestoreTime).toLocaleTimeString()}</p>
                  <p className="text-slate-600"><span className="font-medium text-slate-800">Status:</span>
                    <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${o.status === 'active' ? 'bg-red-100 text-red-700' : o.status === 'repair_in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </p>
                  {o.verifiedByStaff && (
                    <p className="text-green-600 text-xs font-semibold mt-1">✓ Verified by EEU Staff</p>
                  )}
                </div>
              </div>
            </Popup>
          </Circle>
          
          {/* Middle band */}
          <Circle center={o.coordinates} radius={baseRadius * 0.5} pathOptions={{ fillOpacity: 0.3, fillColor: color, weight: 0 }} />
          
          {/* Outer diffuse halo */}
          <Circle center={o.coordinates} radius={baseRadius} pathOptions={{ fillOpacity: 0.1, fillColor: color, color: color, weight: 1, dashArray: '4 6' }} />
        </div>
      )})}
    </MapContainer>
  );
}
