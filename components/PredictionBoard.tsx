"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, Wind, AlertTriangle, Zap, CheckCircle, ChevronRight, Activity, Globe } from 'lucide-react';
import Link from 'next/link';

interface Prediction {
  location: string;
  risk_level: 'low' | 'medium' | 'high';
  probability: number;
  weather_impact?: string;
  predicted_time_window: string;
}

export default function PredictionBoard() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const res = await fetch('/api/predictions');
        const data = await res.json();
        const sorted = (data.predictions || []).sort((a: any, b: any) => (b.probability || 0) - (a.probability || 0));
        setPredictions(sorted.slice(0, 4)); // Show top 4
      } catch (e) { console.error('Board Fetch Error', e); }
      finally { setLoading(false); }
    };

    fetchPredictions();
    const interval = setInterval(fetchPredictions, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;

  return (
    <section className="relative py-24 px-6 bg-slate-950 overflow-hidden border-t border-slate-900">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-[0.2em] mb-4">
              <Activity className="w-4 h-4" />
              <span>Real-Time Weather Intel</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight uppercase">
              District Outage <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Forecasting</span>
            </h2>
            <p className="text-slate-400 mt-6 text-lg max-w-xl">
              Our AI correlates live atmospheric pressure and precipitation from Addis Ababa with historical grid sensitivity to predict neighborhood vulnerabilities.
            </p>
          </div>

          <div className="flex items-center gap-10">
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-black text-white">92%</span>
              <span className="text-[10px] text-slate-500 uppercase font-black">AI Global Confidence</span>
            </div>
            <div className="w-[1px] h-12 bg-slate-800" />
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-black text-cyan-400">Addis</span>
              <span className="text-[10px] text-slate-500 uppercase font-black">Primary Zone</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {predictions.length > 0 ? (
              predictions.map((p, i) => (
                <motion.div
                  key={p.location}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-6 rounded-[2rem] hover:border-blue-500/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 group-hover:text-cyan-400 transition-opacity">
                    <Globe className="w-8 h-8" />
                  </div>

                  <div className="flex items-center justify-between mb-8">
                    <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${
                      p.risk_level === 'high' ? 'bg-red-500/10 text-red-400' : 
                      p.risk_level === 'medium' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-green-500/10 text-green-400'
                    }`}>
                      {p.risk_level} Risk
                    </span>
                    <span className="text-2xl font-black text-white">{p.probability}%</span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors uppercase">{p.location}</h3>
                  <p className="text-[11px] text-slate-500 font-bold mb-6 flex items-center gap-1.5 uppercase">
                    <CloudRain className="w-3 h-3" /> {p.weather_impact || "Dynamic monitoring active"}
                  </p>

                  <div className="space-y-4 pt-4 border-t border-slate-800/50">
                    {/* Prob Bar */}
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${p.probability}%` }}
                        className={`h-full rounded-full ${
                          p.risk_level === 'high' ? 'bg-gradient-to-r from-red-600 to-red-400' : 
                          p.risk_level === 'medium' ? 'bg-gradient-to-r from-cyan-600 to-blue-500' : 'bg-green-500'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-500">Peak Window</span>
                      <span className="text-slate-300">{p.predicted_time_window}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              // Empty state
              [1,2,3,4].map(i => (
                <div key={i} className="h-64 bg-slate-900/20 border border-slate-800/20 rounded-[2rem] animate-pulse" />
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="mt-16 flex justify-center">
            <Link href="/map" className="group flex items-center gap-3 px-8 py-5 bg-white text-slate-950 rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
              View Detailed Heatmap <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>
      </div>
    </section>
  );
}
