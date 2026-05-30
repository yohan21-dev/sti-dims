import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Loader2, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';
import '@/styles/php-login.css';

export default function RegisterPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get('token') ?? '';

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [role, setRole]             = useState('');

  const [form, setForm]     = useState({ username: '', full_name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(false);

  useEffect(() => {
    if (!token) { setValidating(false); return; }
    api.get(`/admin/invite/index.php?token=${token}`)
      .then(r => { setTokenValid(true); setRole(r.data.role); })
      .catch(() => setTokenValid(false))
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8)       { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      await api.post('/admin/invite/index.php', {
        token,
        username:  form.username,
        full_name: form.full_name,
        email:     form.email,
        password:  form.password,
      });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sti-blue/20 border-t-sti-blue rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Validating invite link…</p>
        </div>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-sm w-full text-center shadow-card">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <h1 className="font-display font-bold text-slate-800 text-lg mb-2">Invalid or Expired Link</h1>
          <p className="text-slate-500 text-sm">This invite link is no longer valid. Please ask your administrator for a new one.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-green-200 p-8 max-w-sm w-full text-center shadow-card">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-green-500" />
          </div>
          <h1 className="font-display font-bold text-slate-800 text-lg mb-2">Account Created!</h1>
          <p className="text-slate-500 text-sm">Your account has been created. Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="php-login-page">
      <div className="left-panel">
        <div className="top-bar" />
        <div className="header-logo">
          <h1><span>STI</span> Discipline Information Management System</h1>
        </div>
        <div className="background-image">
          <img src="/assets/images/bg_2.jpg" className="login-bimg" alt="STI background" />
        </div>
      </div>

      <div className="right-panel">
        <div className="login-container">
          <div className="sti-logo">
            <div className="sti-logo-box">
              <img src="/assets/images/sti-logo.png" className="sti-logo-img" alt="STI Logo" />
            </div>
          </div>

          <h1 className="login-title">Create Account</h1>

          <div className="info-box" style={{ marginBottom: '16px' }}>
            <p>You've been invited as a <strong>{role}</strong> on STI DIMS. Fill in your details below.</p>
          </div>

          {error && <p className="error">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Full Name</label>
              <input
                type="text" required placeholder="e.g. Juan Dela Cruz"
                value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label>Username</label>
              <input
                type="text" required placeholder="Choose a username (no spaces)"
                pattern="[a-zA-Z0-9_]+" title="Letters, numbers, underscores only"
                value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email" required placeholder="your@email.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password" required minLength={8} placeholder="At least 8 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="new-password"
              />
            </div>
            <div className="input-group">
              <label>Confirm Password</label>
              <input
                type="password" required minLength={8} placeholder="Repeat your password"
                value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 size={16} className="animate-spin" /> Creating account…
                  </span>
                : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <UserPlus size={16} /> Create Account
                  </span>}
            </button>
          </form>

          <div className="footer-text">© yh.nam1121 | STI College Cubao</div>
        </div>
      </div>
    </div>
  );
}