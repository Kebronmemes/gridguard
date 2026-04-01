"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, MapPin, X, Loader2, Zap, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import type { Outage } from "@/lib/types";

// Ethiopian districts/areas for local autocomplete (Addis Ababa Focused)
const ETHIOPIAN_AREAS = [
  { name: "Bole", district: "Addis Ababa", coords: [8.9806, 38.7578] },
  { name: "Yeka", district: "Addis Ababa", coords: [9.0350, 38.8000] },
  { name: "Arada", district: "Addis Ababa", coords: [9.0350, 38.7470] },
  { name: "Kirkos", district: "Addis Ababa", coords: [9.0050, 38.7480] },
  { name: "Lideta", district: "Addis Ababa", coords: [9.0080, 38.7300] },
  { name: "Gulele", district: "Addis Ababa", coords: [9.0520, 38.7350] },
  { name: "Kolfe Keranio", district: "Addis Ababa", coords: [9.0050, 38.7100] },
  { name: "Nifas Silk-Lafto", district: "Addis Ababa", coords: [8.9700, 38.7400] },
  { name: "Akaki Kaliti", district: "Addis Ababa", coords: [8.8873, 38.7800] },
  { name: "Addis Ketema", district: "Addis Ababa", coords: [9.0200, 38.7350] },
  { name: "Piassa", district: "Addis Ababa", coords: [9.0300, 38.7469] },
  { name: "Merkato", district: "Addis Ababa", coords: [9.0107, 38.7350] },
  { name: "Kazanchis", district: "Addis Ababa", coords: [9.0120, 38.7630] },
  { name: "Sarbet", district: "Addis Ababa", coords: [9.0010, 38.7420] },
  { name: "Megenagna", district: "Addis Ababa", coords: [9.0190, 38.7890] },
  { name: "Ayat", district: "Addis Ababa", coords: [9.0400, 38.8200] },
  { name: "CMC", district: "Addis Ababa", coords: [9.0280, 38.8030] },
  { name: "Garment", district: "Addis Ababa", coords: [8.9663, 38.7410] },
  { name: "Mebrat Haile", district: "Addis Ababa", coords: [8.9550, 38.7300] },
  { name: "Bulbula", district: "Addis Ababa", coords: [8.9720, 38.7850] },
  { name: "Jomo", district: "Addis Ababa", coords: [8.9600, 38.7000] },
];

interface LocationSearchProps {
  onSelect: (area: string, coords: [number, number]) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationSearch({ onSelect, placeholder, className }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<typeof ETHIOPIAN_AREAS>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [outageInfo, setOutageInfo] = useState<Outage[] | null>(null);
  const [loadingOutage, setLoadingOutage] = useState(false);
  const [noOutage, setNoOutage] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInput = useCallback((value: string) => {
    setQuery(value);
    setNoOutage(false);
    setOutageInfo(null);

    if (value.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const q = value.toLowerCase();
    const matches = ETHIOPIAN_AREAS.filter(
      a => a.name.toLowerCase().includes(q) || a.district.toLowerCase().includes(q)
    ).slice(0, 8);

    setSuggestions(matches);
    setShowDropdown(matches.length > 0);
  }, []);

  const handleSelect = useCallback(async (area: typeof ETHIOPIAN_AREAS[0]) => {
    setQuery(area.name);
    setSelectedArea(area.name);
    setSuggestions([]);
    setShowDropdown(false);
    setLoadingOutage(true);
    setNoOutage(false);
    setOutageInfo(null);

    // Notify parent to fly map to location
    onSelect(area.name, area.coords as [number, number]);

    // Lookup outage status for this area
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(area.name)}`);
      const data = await res.json();
      const active = (data.results || []).filter((o: Outage) => o.status !== 'resolved');

      if (active.length > 0) {
        setOutageInfo(active);
        setNoOutage(false);
      } else {
        setOutageInfo(null);
        setNoOutage(true);
      }
    } catch {
      setNoOutage(true);
    }
    setLoadingOutage(false);
  }, [onSelect]);

  const clearSearch = () => {
    setQuery("");
    setSelectedArea(null);
    setOutageInfo(null);
    setNoOutage(false);
    setSuggestions([]);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className || ''}`}>
      {/* Search Input — same styling as before */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          placeholder={placeholder || "Search area, district, or city in Ethiopia..."}
          className="w-full pl-11 pr-10 py-3.5 rounded-xl border border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
        />
        {query && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div className="absolute top-full mt-2 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={`${s.name}-${i}`}
              onClick={() => handleSelect(s)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700/50 transition-colors text-left border-b border-slate-700/50 last:border-b-0"
            >
              <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-white">{s.name}</span>
                <span className="text-xs text-slate-500 ml-2">{s.district}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Outage Status Panel — appears below search after selection */}
      {loadingOutage && (
        <div className="mt-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-sm text-slate-400">Checking outage status for {selectedArea}...</span>
        </div>
      )}

      {noOutage && selectedArea && !loadingOutage && (
        <div className="mt-3 bg-green-500/5 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-300">No current outages in {selectedArea}</p>
            <p className="text-xs text-slate-500 mt-0.5">Power supply is operating normally in this area.</p>
          </div>
        </div>
      )}

      {outageInfo && outageInfo.length > 0 && !loadingOutage && (
        <div className="mt-3 space-y-2">
          {outageInfo.map(o => (
            <div key={o.id} className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <h4 className="text-sm font-semibold text-white">{o.area} — Active Outage</h4>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  o.severity === 'critical' || o.severity === 'grid_failure' ? 'bg-red-500/20 text-red-400' :
                  o.severity === 'moderate' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {o.severity.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mt-2">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span><span className="text-slate-300">Cause:</span> {o.reason}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span><span className="text-slate-300">Started:</span> {new Date(o.startTime).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-green-400" />
                  <span><span className="text-slate-300">ETA Restore:</span> {new Date(o.estimatedRestoreTime).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300">Status:</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    o.status === 'active' ? 'bg-red-500/20 text-red-400' :
                    o.status === 'repair_in_progress' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>{o.status.replace(/_/g, ' ')}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-2">{o.reportCount} reports • ID: {o.id}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
