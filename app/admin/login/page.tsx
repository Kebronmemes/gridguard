"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Eye, EyeOff, AlertTriangle, Zap } from 'lucide-react';
import Link from 'next/link';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      });
      const data = await res.json();

      if (data.success) {
        const role = data.user?.role || '';
        if (role !== 'admin') {
          setError('Access denied. Admin accounts only.');
          setLoading(false);
          return;
        }
        localStorage.setItem('gridguard_user', JSON.stringify(data.user));
        localStorage.setItem('gridguard_token', data.token);
        router.push('/admin');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-slate-950 to-slate-950" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/25">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Admin Control Panel</h1>
          <p className="text-sm text-slate-500">Restricted access. Administrators only.</p>
        </div>

        <form onSubmit={handleLogin} className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 space-y-5 shadow-2xl">
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Admin Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1.5 w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
              placeholder="admin@gridguard.app" autoComplete="username" required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="mt-1.5 w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all pr-12"
                placeholder="Enter admin password" autoComplete="current-password" required
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-slate-500 hover:text-slate-300">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Admin Login'}
          </button>

          <div className="text-center">
            <p className="text-xs text-slate-600">All admin actions are logged and audited.</p>
          </div>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link href="/staff/login" className="text-xs text-slate-600 hover:text-slate-400 transition-colors block">
            Staff portal → /staff/login
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Back to public dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
