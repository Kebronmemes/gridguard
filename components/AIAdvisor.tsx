"use client";

import { useState, useEffect } from "react";
import { Sparkles, Info, ShieldAlert, CheckCircle } from "lucide-react";

interface AIAdvisorProps {
  area: string;
  severity: string;
  reason: string;
}

export default function AIAdvisor({ area, severity, reason }: AIAdvisorProps) {
  const [advice, setAdvice] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!area) return;
    
    async function fetchAdvice() {
      setLoading(true);
      try {
        const res = await fetch("/api/ai/advice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ area, severity, reason }),
        });
        const data = await res.json();
        setAdvice(data.advice || "Stay prepared and follow GridGuard updates.");
      } catch (e) {
        setAdvice("GridGuard AI is currently analyzing your area. Stay safe!");
      } finally {
        setLoading(false);
      }
    }

    fetchAdvice();
  }, [area, severity, reason]);

  if (!area) return null;

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4 shadow-2xl shadow-blue-500/10 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight uppercase">AI Advisor: {area}</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">GridGuard Intelligence</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 py-2">
          <div className="h-3 w-full bg-slate-800 rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-slate-800 rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-slate-300 leading-relaxed font-medium">
            {advice.split('\n').map((line, i) => (
              <p key={i} className="mb-1">{line}</p>
            ))}
          </div>
          
          <div className="flex items-center gap-3 pt-2 border-t border-slate-800/50">
            <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${severity === 'critical' ? 'text-red-400' : 'text-blue-400'}`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              {severity} Issue
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-400">
              <CheckCircle className="w-3.5 h-3.5" />
              Verified Feed
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
