import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle, ShieldAlert, ArrowLeft } from 'lucide-react';
import '@/styles/php-login.css';

type Phase = 'validating' | 'form' | 'submitting' | 'done' | 'invalid';

// Simple password-strength helpers
function calcStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)              score++;
  if (pw.length >= 12)             score++;
  if (/[A-Z]/.test(pw))            score++;
  if (/[0-9]/.test(pw))            score++;
  if (/[^A-Za-z0-9]/.test(pw))     score++;

  const map: Record<number, { label: string; color: string }> = {
    1: { label: 'Weak',      color: '#ef4444' },
    2: { label: 'Fair',      color: '#f97316' },
    3: { label: 'Good',      color: '#eab308' },
    4: { label: 'Strong',    color: '#22c55e' },
    5: { label: 'Very strong', color: '#16a34a' },
  };
  return { score, ...(map[score] ?? map[1]) };
}

export default function ResetPasswordPage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get('token') ?? '';

  const [phase, setPhase]           = useState<Phase>('validating');
  const [emailHint, setEmailHint]   = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [showCf, setShowCf]         = useState(false);
  const [errMsg, setErrMsg]         = useState('');

  const strength = calcStrength(password);

  useEffect(() => {
    if (!token) { setPhase('invalid'); return; }

    api.get(`/auth/reset.php?token=${encodeURIComponent(token)}`)
      .then(r => { setEmailHint(r.data.email_hint ?? ''); setPhase('form'); })
      .catch(() => setPhase('invalid'));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg('');

    if (password.length < 8) {
      setErrMsg('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setErrMsg('Passwords do not match.');
      return;
    }

    setPhase('submitting');

    try {
      await api.post('/auth/reset.php', { token, password });
      setPhase('done');
      setTimeout(() => navigate('/login', { replace: true }), 3500);
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Something went wrong. Please try again.';
      setErrMsg(msg);
      // If the token was already used / expired mid-session, flip to invalid
      if (err.response?.status === 410) setPhase('invalid');
      else setPhase('form');
    }
  };

  // ── Shared page shell ──────────────────────────────────────────────
  const Shell = ({ children }: { children: React.ReactNode }) => (
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
          {children}
          <div className="footer-text">© yh.nam1121 | STI College Cubao</div>
        </div>
      </div>
    </div>
  );

  // ── States ─────────────────────────────────────────────────────────
  if (phase === 'validating') {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#1565c0', display: 'block' }} />
          <p style={{ color: '#64748b', fontSize: 14 }}>Validating your reset link…</p>
        </div>
      </Shell>
    );
  }

  if (phase === 'invalid') {
    return (
      <Shell>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 28, background: '#fee2e2', margin: '0 auto 16px' }}>
            <ShieldAlert size={26} color="#dc2626" />
          </div>
          <h1 className="login-title" style={{ fontSize: 22, marginBottom: 8 }}>Link expired or invalid</h1>
          <div className="info-box" style={{ textAlign: 'left', marginBottom: 16 }}>
            <p>This password reset link has either already been used, expired, or is invalid. Reset links are valid for <strong>1 hour</strong>.</p>
          </div>
          <Link
            to="/forgot-password"
            className="login-btn"
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none', color: '#fff', marginBottom: 12 }}
          >
            Request a new link
          </Link>
          <Link to="/login" style={{ color: '#1565c0', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
            <ArrowLeft size={13} /> Back to login
          </Link>
        </div>
      </Shell>
    );
  }

  if (phase === 'done') {
    return (
      <Shell>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 28, background: '#d1fae5', margin: '0 auto 16px' }}>
            <CheckCircle size={28} color="#059669" />
          </div>
          <h1 className="login-title" style={{ marginBottom: 8 }}>Password updated!</h1>
          <div className="info-box">
            <p>Your password has been changed. All existing sessions have been signed out for security. Redirecting you to login…</p>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────
  return (
    <Shell>
      <h1 className="login-title">Set new password</h1>

      {emailHint && (
        <div className="info-box" style={{ marginBottom: 14 }}>
          <p>Creating a new password for <strong>{emailHint}</strong></p>
        </div>
      )}

      {errMsg && (
        <div className="error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          {errMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* New password */}
        <div className="input-group">
          <label htmlFor="password">New password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="At least 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              style={{ paddingRight: 40, width: '100%' }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Strength meter */}
          {password.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 4,
                      borderRadius: 2,
                      background: i <= strength.score ? strength.color : '#e2e8f0',
                      transition: 'background .2s',
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: 12, color: strength.color, margin: 0, fontWeight: 600 }}>
                {strength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirm */}
        <div className="input-group">
          <label htmlFor="confirm">Confirm new password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="confirm"
              type={showCf ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="Repeat your password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              style={{
                paddingRight: 40,
                width: '100%',
                borderColor: confirm && password !== confirm ? '#ef4444' : undefined,
              }}
            />
            <button
              type="button"
              onClick={() => setShowCf(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
              aria-label={showCf ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showCf ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {confirm && password !== confirm && (
            <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0', fontWeight: 500 }}>
              Passwords do not match
            </p>
          )}
        </div>

        <button
          type="submit"
          className="login-btn"
          disabled={phase === 'submitting' || !password || !confirm}
        >
          {phase === 'submitting' ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Loader2 size={16} className="animate-spin" /> Saving password…
            </span>
          ) : (
            'Set new password'
          )}
        </button>
      </form>

      <div className="help-link" style={{ marginTop: 16 }}>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1565c0', fontSize: 14, textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to login
        </Link>
      </div>
    </Shell>
  );
}