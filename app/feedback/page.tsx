"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, CheckCircle } from "lucide-react";

export default function FeedbackPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '', category: 'general' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setForm({ name: '', email: '', message: '', category: 'general' });
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="font-bold text-white">Feedback</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {submitted ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Thank you for your feedback!</h2>
            <p className="text-sm text-slate-400 mb-4">Your input helps us improve GridGuard for all Ethiopians.</p>
            <button onClick={() => setSubmitted(false)} className="px-5 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors">Submit Another</button>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="w-6 h-6 text-blue-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Send Feedback</h2>
                <p className="text-xs text-slate-500">Help us improve the GridGuard platform</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                    className="mt-1 w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500 outline-none" placeholder="Your name" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                    className="mt-1 w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500 outline-none" placeholder="your@email.com" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="mt-1 w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-blue-500 outline-none">
                  <option value="general">General Feedback</option>
                  <option value="outage_reporting">Outage Reporting Issue</option>
                  <option value="incorrect_data">Incorrect Data</option>
                  <option value="feature_request">Feature Request</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Message</label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required
                  className="mt-1 w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500 outline-none resize-none h-32" placeholder="Tell us what's on your mind..." />
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                {loading ? 'Sending...' : 'Submit Feedback'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
