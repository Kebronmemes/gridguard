"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, GeoJSON, useMapEvents } from "react-leaflet";
import type { Outage } from "@/lib/types";

const ADDIS_ABABA: [number, number] = [9.0, 38.75];
const SEVERITY_COLORS: Record<string, string> = {
  low: '#3b82f6', moderate: '#f59e0b', critical: '#ef4444', grid_failure: '#7c2d12',
};

function ClickHandler({ onMapClick }: { onMapClick: (pos: [number, number]) => void }) {
  useMapEvents({ click(e) { onMapClick([e.latlng.lat, e.latlng.lng]); } });
  return null;
}

export default function StaffInteractiveMap({ token, onRefresh }: { token: string; onRefresh: () => void }) {
  const [isMounted, setIsMounted] = useState(false);
  const [outages, setOutages] = useState<Outage[]>([]);
  const [geoData, setGeoData] = useState<any>(null);
  const [clickedPos, setClickedPos] = useState<[number, number] | null>(null);
  const [quickForm, setQuickForm] = useState({ area: '', reason: '', type: 'emergency', severity: 'critical' });
  const [status, setStatus] = useState('');

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    fetch('/data/addis_districts.geojson')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(e => console.error('GeoJSON fetch error', e));
  }, []);

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

        {/* Render GeoJSON Polygons for Districts */}
        {geoData && (
          <GeoJSON
            key={`geojson-${outages.length}`}
            data={geoData}
            style={(feature: any) => {
              const districtName = feature.properties.name;
              const activeOutage = outages.find(o => o.area === districtName || o.district === districtName);
              if (activeOutage) return { color: "red", fillColor: "red", fillOpacity: 0.5, weight: 4 };
              return { color: "#475569", fillColor: "transparent", fillOpacity: 0, weight: 1 };
            }}
            onEachFeature={(feature: any, layer: any) => {
              const districtName = feature.properties.name;
              const activeOutage = outages.find(o => o.area === districtName || o.district === districtName);
              if (activeOutage) {
                const popupContent = `
                  <div style="font-family: sans-serif; min-width: 200px; padding: 4px;">
                    <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">${districtName}</h3>
                    <div style="font-size: 12px; margin-bottom: 6px; display: inline-block; padding: 2px 6px; border-radius: 12px; font-weight: bold; background-color: ${SEVERITY_COLORS[activeOutage.severity]}20; color: ${SEVERITY_COLORS[activeOutage.severity]}">${activeOutage.severity.toUpperCase()}</div>
                    <p style="margin: 4px 0;"><strong>Reports:</strong> ${activeOutage.reportCount}</p>
                    <p style="margin: 4px 0;"><strong>Cause:</strong> ${activeOutage.reason || 'EEU Power Interruption'}</p>
                    ${activeOutage.verifiedByStaff ? '<p style="color: #16a34a; font-size: 11px; font-weight: bold; margin-top: 8px;">[Verified by Staff]</p>' : ''}
                  </div>
                `;
                layer.bindPopup(popupContent);
              } else {
                layer.bindPopup(`<div style="font-family: sans-serif; padding: 4px;"><strong>${districtName}</strong><br/><span style="color: #16a34a; font-size: 12px;">Grid Status: Normal</span></div>`);
              }
            }}
          />
        )}

        {outages.map(o => {
          const isMappedDistrict = geoData?.features?.some((f: any) => f.properties.name === o.area || f.properties.name === o.district);
          return (
            <div key={o.id}>
              {o.polygon && o.polygon.length >= 3 && (
                <Polygon positions={o.polygon} pathOptions={{ color: SEVERITY_COLORS[o.severity], fillColor: SEVERITY_COLORS[o.severity], fillOpacity: 0.15, weight: 2 }} />
              )}
              {!isMappedDistrict && (
                <CircleMarker center={o.coordinates} radius={o.severity === 'critical' ? 11 : 8}
                  pathOptions={{ color: SEVERITY_COLORS[o.severity], fillColor: SEVERITY_COLORS[o.severity], fillOpacity: 0.7, weight: 2 }}>
                  <Popup>
                    <div className="min-w-[180px] font-sans">
                      <h3 className="font-bold text-sm">{o.area} <span className="text-xs font-normal text-slate-500">{o.id}</span></h3>
                      <p className="text-xs text-slate-600 mt-1">{o.reason}</p>
                      <p className="text-xs text-slate-500 mt-1">{o.reportCount} reports • {o.status.replace(/_/g, ' ')}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              )}
            </div>
          );
        })}

        {clickedPos && (
          <CircleMarker center={clickedPos} radius={12} pathOptions={{ color: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.3, weight: 3, dashArray: '4 4' }}>
            <Popup>
              <div className="min-w-[200px] font-sans p-1">
                <h4 className="font-bold text-sm border-b pb-1 mb-2">Quick Outage Report</h4>
                <input value={quickForm.area} onChange={e => setQuickForm({ ...quickForm, area: e.target.value })}
                  placeholder="Area name" className="w-full px-2 py-1.5 border rounded text-xs mb-1.5 outline-none" />
                <input value={quickForm.reason} onChange={e => setQuickForm({ ...quickForm, reason: e.target.value })}
                  placeholder="Reason / cause" className="w-full px-2 py-1.5 border rounded text-xs mb-1.5 outline-none" />
                <select value={quickForm.severity} onChange={e => setQuickForm({ ...quickForm, severity: e.target.value })}
                  className="w-full px-2 py-1.5 border rounded text-xs mb-2 outline-none">
                  <option value="low">Low</option><option value="moderate">Moderate</option><option value="critical">Critical</option><option value="grid_failure">Grid Failure</option>
                </select>
                {status && <p className="text-xs text-center mb-1">{status}</p>}
                <button onClick={handleQuickCreate} className="w-full bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-2 rounded transition-colors">Confirm Outage</button>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      <div className="absolute top-3 right-3 z-[400] bg-slate-900/90 backdrop-blur border border-slate-700/50 rounded-xl p-3 max-w-[180px]">
        <h3 className="text-xs font-bold text-slate-300 mb-1.5">Staff HUD</h3>
        <p className="text-[10px] text-slate-500 mb-2">Click map to report outage. Live updates every 10s.</p>
        <div className="text-[10px] text-slate-400 space-y-0.5">
          <p>Active: {outages.length}</p>
          <p>Critical: {outages.filter(o => o.severity === 'critical').length}</p>
        </div>
      </div>
    </>
  );
}
