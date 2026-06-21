import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { ArrowLeft, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import '@/styles/php-login.css';

type Phase = 'form' | 'loading' | 'sent' | 'error';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [phase, setPhase]   = useState<Phase>('form');
  const [errMsg, setErrMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setPhase('loading');
    setErrMsg('');

    try {
      // The backend always returns 200 (intentionally vague to prevent
      // email enumeration), so we just move to "sent" on success.
      await api.post('/auth/forgot.php', { email: email.trim().toLowerCase() });
      setPhase('sent');
    } catch {
      setErrMsg('Something went wrong. Please try again later.');
      setPhase('error');
    }
  };

  return (
    <div className="php-login-page">
      {/* Left panel — same STI branding */}
      <div className="left-panel">
        <div className="top-bar" />
        <div className="header-logo">
          <h1>
            <span>STI</span> Discipline Information Management System
          </h1>
        </div>
        <div className="background-image">
          <img src="/assets/images/bg_2.jpg" className="login-bimg" alt="STI background" />
        </div>
      </div>

      {/* Right panel */}
      <div className="right-panel">
        <div className="login-container">
          <div className="sti-logo">
            <div className="sti-logo-box">
              <img src="/assets/images/sti-logo.png" className="sti-logo-img" alt="STI Logo" />
            </div>
          </div>

          {/* ── Sent confirmation ── */}
          {phase === 'sent' ? (
            <div className="space-y-4 text-center mt-4">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  background: '#d1fae5',
                  margin: '0 auto 12px',
                }}
              >
                <CheckCircle size={28} color="#059669" />
              </div>
              <h1 className="login-title" style={{ marginBottom: 8 }}>Check your email</h1>
              <div className="info-box" style={{ textAlign: 'left' }}>
                <p>
                  If <strong>{email}</strong> is registered, we've sent a password reset link.
                  Check your inbox (and spam folder) — the link expires in <strong>1 hour</strong>.
                </p>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
                Didn't receive it?{' '}
                <button
                  onClick={() => { setPhase('form'); }}
                  style={{ color: '#1565c0', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  Try again
                </button>
              </p>
              <div style={{ marginTop: 12 }}>
                <Link to="/login" style={{ color: '#1565c0', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ArrowLeft size={14} /> Back to login
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h1 className="login-title">Forgot password?</h1>

              {/* Error banner */}
              {phase === 'error' && (
                <div className="error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  {errMsg}
                </div>
              )}

              <div className="info-box" style={{ marginBottom: 18 }}>
                <p>Enter the email address on your account and we'll send you a link to reset your password.</p>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="input-group">
                  <label htmlFor="email">Email address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={15}
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      id="email"
                      type="email"
                      name="email"
                      required
                      placeholder="your@email.com"
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={{ paddingLeft: 36 }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="login-btn"
                  disabled={phase === 'loading' || !email.trim()}
                >
                  {phase === 'loading' ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Loader2 size={16} className="animate-spin" /> Sending link…
                    </span>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>

              <div className="help-link" style={{ marginTop: 16 }}>
                <Link
                  to="/login"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1565c0', fontSize: 14, textDecoration: 'none' }}
                >
                  <ArrowLeft size={14} /> Back to login
                </Link>
              </div>
            </>
          )}

          <div className="footer-text">© yh.nam1121 | STI College Cubao</div>
        </div>
      </div>
    </div>
  );
}