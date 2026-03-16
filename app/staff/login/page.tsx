"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Zap, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function StaffLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.success) {
        // Store both user data and the secure JWT token
        localStorage.setItem('gridguard_user', JSON.stringify(data.user));
        localStorage.setItem('gridguard_token', data.token);
        router.push('/staff');
      } else {
        setError(data.error || 'Login failed');
        if (data.attemptsRemaining !== undefined) setAttemptsLeft(data.attemptsRemaining);
        if (data.locked) setAttemptsLeft(0);
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">EEU Staff Portal</h1>
          <p className="text-sm text-slate-500">Authorized personnel only. All access is logged.</p>
        </div>

        <form onSubmit={handleLogin} className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6 space-y-5 shadow-2xl">
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p>{error}</p>
                {attemptsLeft !== null && attemptsLeft > 0 && (
                  <p className="text-xs mt-1 text-red-500">{attemptsLeft} attempt(s) remaining before lockout</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Staff Username</label>
            <input
              type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="mt-1.5 w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              placeholder="Enter your staff ID" autoComplete="username" required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="mt-1.5 w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all pr-12"
                placeholder="Enter password" autoComplete="current-password" required
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-slate-500 hover:text-slate-300">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>

          <div className="text-center">
            <p className="text-xs text-slate-600">Secure Employee Access Portal</p>
          </div>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Back to public dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
