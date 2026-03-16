"use client";

import Link from "next/link";
import { ArrowLeft, Phone, Mail, MapPin, Clock, Zap, AlertTriangle, MessageSquare } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="font-bold text-white">Contact & Emergency</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Emergency Banner */}
        <div className="bg-gradient-to-r from-red-500/10 to-red-900/10 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h2 className="text-xl font-bold text-white">Emergency Contacts</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
              <Phone className="w-5 h-5 text-red-400 mb-2" />
              <h3 className="font-bold text-white text-sm">Electric Emergency Hotline</h3>
              <p className="text-2xl font-bold text-red-400 mt-1">939</p>
              <p className="text-xs text-slate-500 mt-1">Available 24/7</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
              <Phone className="w-5 h-5 text-amber-400 mb-2" />
              <h3 className="font-bold text-white text-sm">Maintenance Dispatch</h3>
              <p className="text-lg font-bold text-amber-400 mt-1">+251-111-XXXX</p>
              <p className="text-xs text-slate-500 mt-1">Mon-Sat 06:00 - 22:00</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
              <Mail className="w-5 h-5 text-blue-400 mb-2" />
              <h3 className="font-bold text-white text-sm">GridGuard Support</h3>
              <p className="text-lg font-bold text-blue-400 mt-1">support@gridguard.et</p>
              <p className="text-xs text-slate-500 mt-1">Response within 2 hours</p>
            </div>
          </div>
        </div>

        {/* Office Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-400" /> Head Office</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <p>Ethiopian Electric Utility (EEU)</p>
              <p>De Gaulle Square, Piassa</p>
              <p>Addis Ababa, Ethiopia</p>
              <p>P.O. Box 1233</p>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-amber-400" /> Support Hours</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400"><span>Emergency Hotline (939)</span><span className="text-green-400 font-medium">24/7</span></div>
              <div className="flex justify-between text-slate-400"><span>Customer Service</span><span className="text-white">Mon-Sat 08:00-17:00</span></div>
              <div className="flex justify-between text-slate-400"><span>Maintenance Dispatch</span><span className="text-white">Mon-Sat 06:00-22:00</span></div>
              <div className="flex justify-between text-slate-400"><span>Email Support</span><span className="text-white">Mon-Fri 09:00-18:00</span></div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-400" /> Send us a Message</h3>
          <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={e => { e.preventDefault(); alert('Message sent! (demo)'); }}>
            <input placeholder="Your name" required className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500 outline-none" />
            <input type="email" placeholder="Your email" required className="px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500 outline-none" />
            <textarea placeholder="Your message..." required className="sm:col-span-2 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500 outline-none resize-none h-28" />
            <button type="submit" className="sm:col-span-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors">Send Message</button>
          </form>
        </div>
      </main>
    </div>
  );
}
