// src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

import '@/styles/php-login.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(username.trim(), password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Invalid username or password.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="php-login-page">
      {/* Left side - Background Image */}
      <div className="left-panel">
        <div className="top-bar" />

        <div className="header-logo">
          <h1>
            <span>STI</span> Discipline Information Management System
          </h1>
        </div>

        <div className="background-image">
          <img
            src="/assets/images/bg_2.jpg"
            className="login-bimg"
            alt="STI background"
          />
        </div>
      </div>

      {/* Right side - Login Card */}
      <div className="right-panel">
        <div className="login-container">
          <div className="sti-logo">
            <div className="sti-logo-box">
              <img
                src="/assets/images/sti-logo.png"
                className="sti-logo-img"
                alt="STI Logo"
              />
            </div>
          </div>

          <h1 className="login-title">Login now</h1>

          {error && <p className="error">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                name="username"
                required
                placeholder="Enter your username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                required
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="help-link">
            <a href="#">Having trouble logging in? Click here</a>
          </div>

          <div className="info-box">
            <p>
              This is a prototype system for STI&apos;s Discipline Office. Any
              copyright infringement is unintentional.
            </p>
          </div>

          <div className="footer-text">
            © yh.nam1121 | STI College Cubao
          </div>
        </div>
      </div>
    </div>
  );
}