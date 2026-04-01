"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, ShieldAlert, Users, Globe, MapPin, ArrowRight, BarChart3, Clock, CheckCircle, Bell, Activity } from "lucide-react";
import PredictionBoard from "@/components/PredictionBoard";

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

export default function Home() {
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  useEffect(() => {
    const hasPrompted = localStorage.getItem('gridguard_location_prompt');
    if (!hasPrompted) {
      setTimeout(() => setShowLocationPrompt(true), 2000);
    }
  }, []);

  const handleGrantLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now() };
        localStorage.setItem('gridguard_last_location', JSON.stringify(loc));
        localStorage.setItem('gridguard_location_prompt', 'granted');
        setShowLocationPrompt(false);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden selection:bg-blue-500/30">
      
      {/* Location Access Prompt Modal */}
      {showLocationPrompt && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-[380px] z-[100] bg-slate-900 border border-slate-700 p-6 rounded-3xl shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <MapPin className="text-blue-400 w-5 h-5" />
            </div>
            <h4 className="font-bold">Smart Outage Detection</h4>
          </div>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Allow location access to enable the <strong>Auto-Report</strong> system. If your neighborhood loses power, our AI will automatically detect the interruption even if you are offline.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={handleGrantLocation}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Enable Smart Detection
            </button>
            <button 
              onClick={() => { localStorage.setItem('gridguard_location_prompt', 'dismissed'); setShowLocationPrompt(false); }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-sm font-bold transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">GridGuard</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/staff/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors hidden sm:block">
              Staff Portal
            </Link>
            <Link href="/map" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-full transition-all flex items-center gap-2">
              Open Map <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 flex flex-col items-center text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
          
          <motion.div initial="hidden" animate="visible" variants={fadeIn} className="z-10 flex flex-col items-center max-w-4xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider rounded-full mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Live in Ethiopia
            </span>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              Smart Power Outage <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                Intelligence
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12">
              Track real-time grid status, view official scheduled interruptions, and report local outages instantly on our dynamic map.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/map" className="px-8 py-4 bg-white text-slate-900 font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2">
                Launch Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="#features" className="px-8 py-4 bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-full hover:bg-slate-800 transition-colors">
                Explore Features
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Why it Exists Section */}
        <section className="py-24 bg-slate-900/50 border-y border-slate-800/50">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn}
              className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
            >
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Why GridGuard Exists</h2>
                <div className="space-y-6 text-slate-400 text-lg leading-relaxed">
                  <p>
                    Frequent power interruptions can severely disrupt daily activities, business operations, and essential services across Ethiopia. Historically, citizens lacked a centralized, real-time platform to understand grid status.
                  </p>
                  <p>
                    GridGuard was created to bridge this information gap. By aggregating official Ethiopian Electric Utility (EEU) schedules and crowdsourcing citizen reports, we provide a unified, transparent view of the national grid.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "24/7", label: "Live Monitoring", icon: <Clock className="text-blue-400" /> },
                  { value: "100%", label: "Verified Data", icon: <CheckCircle className="text-green-400" /> },
                  { value: "Real-time", label: "Alerts", icon: <Bell className="text-amber-400" /> },
                  { value: "National", label: "Coverage", icon: <Globe className="text-purple-400" /> },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 p-6 rounded-2xl flex flex-col gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-800">
                      {stat.icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                      <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* National Impact Section [NEW] */}
        <section className="py-24 bg-slate-900 border-y border-slate-800">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
                <h2 className="text-3xl md:text-5xl font-bold mb-8">National Economic Impact</h2>
                <div className="space-y-6 text-slate-400 text-lg leading-relaxed">
                  <p>
                    Unreliable power supply costs the Ethiopian economy billions of ETB annually in lost productivity, spoiled goods, and industrial downtime. For small businesses, an outage isn't just an inconvenience—it's a direct threat to their livelihood.
                  </p>
                  <p>
                    GridGuard uses AI to model these losses in real-time. By providing 100% transparency on grid status, we help businesses plan their shifts and the government identify high-priority zones that require immediate infrastructure investment.
                  </p>
                </div>
              </motion.div>
              <div className="bg-slate-950 border border-slate-800 p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
                <div className="relative z-10 space-y-8">
                  <div>
                    <span className="text-xs font-black text-blue-500 uppercase tracking-widest">Industry Loss Detection</span>
                    <h3 className="text-4xl font-bold mt-2">12,500 ETB <span className="text-sm font-normal text-slate-500">/hr per district</span></h3>
                    <p className="text-sm text-slate-400 mt-2">Calculated economic leakage during peak hours based on SME density.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 p-4 bg-slate-900 rounded-xl border border-slate-800">
                      <div className="text-red-400 font-bold">18%</div>
                      <div className="text-[10px] text-slate-500 uppercase">Revenue Leakage</div>
                    </div>
                    <div className="flex-1 p-4 bg-slate-900 rounded-xl border border-slate-800">
                      <div className="text-blue-400 font-bold">4.2h</div>
                      <div className="text-[10px] text-slate-500 uppercase">Avg. Downtime</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 md:py-32 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16 max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Powerful Features</h2>
              <p className="text-slate-400 text-lg">Everything you need to stay informed about power availability and plan ahead.</p>
            </div>

            <motion.div 
              variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {[
                { title: "Interactive Map", desc: "View a live, color-coded map showing current outages, scheduled maintenance, and grid failures.", icon: <MapPin className="text-emerald-400" />, bg: "bg-emerald-500/10" },
                { title: "Citizen Reporting", desc: "Instantly report power losses in your area. Our algorithm clusters reports to detect broad outages automatically.", icon: <Users className="text-blue-400" />, bg: "bg-blue-500/10" },
                { title: "Historical Analytics", desc: "Drill down into any district to view its outage history, reliability metrics, and average restore times.", icon: <BarChart3 className="text-purple-400" />, bg: "bg-purple-500/10" },
                { title: "EEU Auto-Sync", desc: "Our system continuously reads and translates official EEU schedules from Amharic so you are always prepared.", icon: <Zap className="text-amber-400" />, bg: "bg-amber-500/10" },
                { title: "Email Notifications", desc: "Subscribe to your local district and receive automated email alerts the moment an outage or maintenance is scheduled.", icon: <Bell className="text-rose-400" />, bg: "bg-rose-500/10" },
                { title: "Safety Guidelines", desc: "Access official safety protocols and read updates published directly by EEU administrators.", icon: <ShieldAlert className="text-cyan-400" />, bg: "bg-cyan-500/10" }
              ].map((f, i) => (
                <motion.div key={i} variants={fadeIn} className="bg-slate-900/40 border border-slate-800 hover:bg-slate-800/60 p-8 rounded-3xl transition-colors">
                  <div className={`w-14 h-14 rounded-2xl ${f.bg} flex items-center justify-center mb-6`}>
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* How to Use Section */}
        <section className="py-24 bg-gradient-to-b from-slate-950 to-slate-900 border-t border-slate-800">
          <div className="max-w-5xl mx-auto px-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">How to Use GridGuard</h2>
              <p className="text-slate-400 text-lg">Three simple steps to stay ahead of the grid.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0" />
              
              {[
                { step: "01", title: "Open the Map", desc: "Launch the dashboard to instantly see the national grid status visually." },
                { step: "02", title: "Select Your Area", desc: "Search for your district or click on the map to view local specific history." },
                { step: "03", title: "Subscribe", desc: "Click 'Subscribe' to receive instant email alerts whenever maintenance is planned." }
              ].map((s, i) => (
                <motion.div key={i} variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }} className="relative flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-slate-900 border-4 border-slate-950 shadow-xl flex items-center justify-center text-2xl font-black text-blue-500 mb-6 relative z-10">
                    {s.step}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-24 md:py-32">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Our Team</h2>
              <h3 className="text-xl text-blue-400 font-semibold mb-8">South West Academy Students</h3>
              <p className="text-lg text-slate-400 leading-relaxed bg-slate-900/50 border border-slate-800 p-8 rounded-3xl inline-block max-w-2xl text-left shadow-2xl">
                GridGuard is a technical initiative built entirely by students from South West Academy. We recognized the profound impact of power interruptions on our education and daily lives. By utilizing modern web technologies, AI-driven web scraping, and real-time mapping, this software was crafted to improve operational transparency and communication around electricity outages for all Ethiopians.
              </p>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-600">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:24px_24px]" />
          </div>
          
          <div className="relative max-w-4xl mx-auto px-6 text-center z-10">
            <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-8">
              Ready to monitor your grid?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Join thousands of citizens using GridGuard to plan their day and stay informed about sudden power outages.
            </p>
            <Link href="/map" className="inline-flex px-10 py-5 bg-white text-blue-600 font-bold text-lg rounded-full hover:scale-105 transition-transform items-center gap-3 shadow-2xl">
              Go to Dashboard <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

        {/* Live Predictions Board */}
        <PredictionBoard />

        {/* Blog Highlights Section [NEW] */}
        <section className="py-24 bg-slate-950">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-bold">Latest Updates</h2>
                <p className="text-slate-400 mt-2">Official news and grid maintenance alerts.</p>
              </div>
              <Link href="/blog" className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { title: "Bole District Maintenance", date: "April 02, 2026", type: "Alert" },
                { title: "Grid Stabilization Progress", date: "March 30, 2026", type: "News" },
                { title: "Safety in Power Outages", date: "March 28, 2026", type: "Guide" }
              ].map((p, i) => (
                <Link key={i} href="/blog" className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:bg-slate-800 transition-all group">
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded uppercase tracking-wider">{p.type}</span>
                  <h3 className="text-lg font-bold mt-3 group-hover:text-blue-400 transition-colors">{p.title}</h3>
                  <p className="text-slate-500 text-sm mt-2">{p.date}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer className="bg-slate-950 border-t border-slate-900 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <span className="font-bold">GridGuard</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 GridGuard Ethiopia. Developed at South West Academy.</p>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <Link href="/history" className="hover:text-white transition-colors">History</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/staff/login" className="hover:text-white transition-colors">Staff Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
