// src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Login failed');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-stretch">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-navy-900 items-center justify-center">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(240,168,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(240,168,0,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 text-center px-12 max-w-lg">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gold-500/10 border border-gold-500/30 mb-6 shadow-glow-gold">
            <ShieldCheck size={36} className="text-gold-500" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-3 leading-tight">
            Discipline Information<br />Management System
          </h1>
          <p className="text-slate-400 leading-relaxed">
            A secure platform for STI College Cubao's Discipline Office to record
            violations, track service hours, and maintain complete student conduct records.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Secure Auth', desc: 'JWT + HttpOnly' },
              { label: 'Full Audit', desc: 'Every action logged' },
              { label: 'Role Based', desc: 'Admin · Officer · Viewer' },
            ].map(f => (
              <div key={f.label} className="p-3 rounded-xl bg-navy-800/60 border border-navy-700/40">
                <p className="text-gold-400 font-semibold text-sm">{f.label}</p>
                <p className="text-slate-500 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-[420px] flex flex-col items-center justify-center px-8 py-12 bg-navy-950">
        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center mb-3">
            <ShieldCheck size={26} className="text-gold-500" />
          </div>
          <p className="font-display font-bold text-white text-lg">STI DIMS</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-white">Sign in</h2>
            <p className="text-slate-400 text-sm mt-1">Use your discipline office credentials</p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="input-label">Username or Email</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="password" className="input-label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-slate-600 text-xs mt-8">
            © STI Education Services Group, Inc.
          </p>
        </div>
      </div>
    </div>
  );
}