import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Users, AlertTriangle, Shield, ChevronRight, ChevronLeft, ArrowRight } from "lucide-react";

const slides = [
  {
    id: 1,
    icon: <Zap className="w-12 h-12" />,
    iconBg: "from-blue-500 to-cyan-400",
    title: "What is GridGuard?",
    subtitle: "Real-Time Power Outage Intelligence",
    content: [
      "GridGuard is a power outage monitoring and reporting platform designed for Ethiopia.",
      "Track live outages across the country on an interactive map.",
      "Report power issues instantly from your location.",
      "Receive notifications when your area is affected.",
      "Access analytics and historical outage data.",
    ],
    badge: "Platform Overview",
  },
  {
    id: 2,
    icon: <Users className="w-12 h-12" />,
    iconBg: "from-violet-500 to-purple-400",
    title: "Built by South West Academy Students",
    subtitle: "Young Innovators Solving Real Problems",
    content: [
      "GridGuard was conceptualized and built by students at South West Academy.",
      "A civic-tech initiative aimed at improving public digital infrastructure.",
      "Designed to serve Ethiopian communities through accessible technology.",
      "Created with a vision for national integration with Ethiopian Electric Utility.",
    ],
    badge: "Our Team",
  },
  {
    id: 3,
    icon: <AlertTriangle className="w-12 h-12" />,
    iconBg: "from-amber-500 to-orange-400",
    title: "Why GridGuard?",
    subtitle: "Ethiopia’s Power Challenge",
    content: [
      "Ethiopia experiences frequent planned and unplanned power outages.",
      "Citizens often have no advance warning or real-time updates.",
      "People don’t know when electricity will go out — or come back.",
      "GridGuard bridges this gap: report outages, track them on a map, and get real-time notifications.",
      "Powered by automated data from Ethiopian Electric Utility (EEU).",
    ],
    badge: "The Problem",
  },
  {
    id: 4,
    icon: <Shield className="w-12 h-12" />,
    iconBg: "from-emerald-500 to-green-400",
    title: "Electrical Safety & Awareness",
    subtitle: "Stay Safe. Stay Informed.",
    content: [
      "Never touch downed power lines — always assume they are live.",
      "Unplug appliances during outages to prevent surge damage.",
      "Keep generators outdoors to avoid carbon monoxide poisoning.",
      "Report damaged infrastructure to EEU immediately (call 939).",
      "Ethiopian Electric Utility (EEU) is the national electricity provider.",
    ],
    badge: "Safety First",
    safetyLinks: [
      { label: "EEU Official Website", url: "https://www.eeu.gov.et" },
      { label: "EEU Power Interruption Schedule", url: "https://www.eeu.gov.et/power-interruption?lang=en" },
      { label: "Emergency Hotline: 939", url: "tel:939" },
    ],
  },
];

export default function IntroSlides({ onComplete }: { onComplete: () => void }) {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];
  const isLast = current === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-8 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? "w-8 bg-blue-500" : "w-2 bg-slate-700 hover:bg-slate-600"
            }`}
          />
        ))}
      </div>

      {/* Slide content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="max-w-2xl w-full z-10"
        >
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 sm:p-10 backdrop-blur-sm shadow-2xl">
            {/* Badge */}
            <span className="inline-block px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-400 font-medium mb-6">
              {slide.badge}
            </span>

            {/* Icon */}
            <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${slide.iconBg} flex items-center justify-center text-white mb-6 shadow-lg`}>
              {slide.icon}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              {slide.title}
            </h1>
            <p className="text-slate-400 text-lg mb-6">{slide.subtitle}</p>

            {/* Content */}
            <ul className="space-y-3 mb-8">
              {slide.content.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex items-start gap-3 text-slate-300"
                >
                  <span className="mt-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{item}</span>
                </motion.li>
              ))}
            </ul>

            {/* Safety links (slide 4 only) */}
            {slide.safetyLinks && (
              <div className="border-t border-slate-800 pt-5 mb-6">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Resources</p>
                <div className="flex flex-wrap gap-2">
                  {slide.safetyLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs bg-slate-800 text-blue-400 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center gap-4 mt-8 z-10">
        {current > 0 && (
          <button
            onClick={() => setCurrent(current - 1)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}

        {!isLast ? (
          <button
            onClick={() => setCurrent(current + 1)}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors text-sm font-medium shadow-lg shadow-blue-500/20"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onComplete}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:opacity-90 transition-all text-sm font-semibold shadow-lg shadow-blue-500/30"
          >
            Enter GridGuard <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Skip link */}
      {!isLast && (
        <button
          onClick={onComplete}
          className="mt-4 text-xs text-slate-600 hover:text-slate-400 transition-colors z-10"
        >
          Skip intro →
        </button>
      )}

      {/* Footer */}
      <p className="mt-8 text-[11px] text-slate-700 text-center z-10">
        © 2026 GridGuard Ethiopia — South West Academy • Powered by EEU Data
      </p>
    </div>
  );
}
