"use client";

import { useState, useCallback } from "react";
import { Share2, Download, X, WifiOff, RefreshCw } from "lucide-react";

interface ExportData {
  v: number;
  exportedAt: string;
  outages: any[];
  predictions: any[];
}

export default function OfflineExport() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [error, setError] = useState('');
  const [formStatus, setFormStatus] = useState('');

  const generateExport = useCallback(async () => {
    setLoading(true);
    setError('');
    setQrDataUrl(null);

    try {
      const res = await fetch('/api/public/export');
      const data: ExportData = await res.json();
      setExportData(data);

      localStorage.setItem('gg_export_cache', JSON.stringify(data));
      localStorage.setItem('gg_export_time', data.exportedAt);

      await generateQR(data);
    } catch (err) {
      setError('Failed to fetch data. Using cached version.');
      const cached = localStorage.getItem('gg_export_cache');
      if (cached) {
        const data = JSON.parse(cached);
        setExportData(data);
        await generateQR(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const generateQR = async (data: ExportData) => {
    const compact = {
      v: data.v,
      t: new Date(data.exportedAt).getTime(),
      o: data.outages.slice(0, 10).map(o => ({
        a: o.area,
        s: o.severity?.charAt(0),
        r: o.reason?.substring(0, 40),
        c: o.coordinates,
      })),
      p: data.predictions.slice(0, 5).map(p => ({
        l: p.location,
        r: p.risk_level?.charAt(0),
        s: p.confidence_score,
      })),
    };

    const jsonStr = JSON.stringify(compact);
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(jsonStr)}&bgcolor=0f172a&color=60a5fa&qzone=1&format=svg`;
    setQrDataUrl(qrApiUrl);
  };

  const downloadJSON = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gridguard-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.v && imported.outages) {
          localStorage.setItem('gg_outages_cache', JSON.stringify(imported.outages));
          if (imported.predictions) localStorage.setItem('gg_predictions_cache', JSON.stringify(imported.predictions));
          setFormStatus('Import successful! Refreshing map...');
          setTimeout(() => { window.location.reload(); }, 1500);
        } else {
          setError('Invalid export file format.');
        }
      } catch {
        setError('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <button
        onClick={() => { setOpen(true); generateExport(); }}
        title="Export / Offline Data"
        className="fixed bottom-6 left-4 z-[9998] flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-all"
        style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(59,130,246,0.35)', backdropFilter: 'blur(10px)' }}
      >
        <Share2 className="w-3.5 h-3.5 text-blue-400" />
        <span className="hidden sm:inline">Export / QR</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="relative rounded-2xl p-6 w-full max-w-sm shadow-2xl" style={{ background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(51,65,85,0.5)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-400" />
                Offline Hub
              </h2>
              <p className="text-xs text-slate-500 mt-1">Share live data via QR or import exported files.</p>
            </div>

            {formStatus && <p className="text-xs text-blue-400 mb-3 text-center font-bold bg-blue-500/10 p-2 rounded-lg">{formStatus}</p>}
            {error && <p className="text-red-400 text-xs mb-3 text-center">{error}</p>}

            {loading && (
              <div className="flex items-center justify-center h-40">
                <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {qrDataUrl && !loading && (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-xl overflow-hidden" style={{ background: '#0f172a', padding: '12px', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <img src={qrDataUrl} alt="Outage data QR" width={240} height={240} />
                </div>

                {exportData && (
                  <div className="text-center text-[10px] text-slate-500 space-y-0.5">
                    <p>{exportData.outages.length} active • {exportData.predictions.length} risk zones</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 w-full">
                  <button onClick={downloadJSON} className="flex items-center justify-center gap-2 py-2.5 text-[11px] font-semibold rounded-lg transition-colors text-white" style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <Download className="w-3 h-3" /> Export JSON
                  </button>
                  <label className="flex items-center justify-center gap-2 py-2.5 text-[11px] font-semibold rounded-lg transition-colors text-white cursor-pointer" style={{ background: 'rgba(30,41,59,0.3)', border: '1px solid rgba(51,65,85,0.4)' }}>
                    <Share2 className="w-3 h-3" /> Import JSON
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                </div>
                
                <button onClick={generateExport} className="w-full mt-1 flex items-center justify-center gap-2 py-2 bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 rounded-lg text-[10px] text-slate-400 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Refresh Live Data
                </button>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-600 flex items-center gap-1.5">
              <WifiOff className="w-3 h-3" />
              Data cached locally for offline access
            </div>
          </div>
        </div>
      )}
    </>
  );
}
