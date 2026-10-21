import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Shield, User, X, AlertTriangle, Check } from 'lucide-react';
import './auth.css';

/**
 * AuthPage — Login & Register page for CYBER-AGENT AI.
 *
 * Props:
 *   onAuthSuccess(token, user) — called after successful login or register.
 *                                 The parent should store the token and navigate to /dashboard.
 *
 * Wiring into main.jsx (minimal changes required — see INTEGRATION DIFF below):
 *
 *   1. Import this component:
 *      import AuthPage from './AuthPage.jsx';
 *
 *   2. Change the routing logic at the bottom of main.jsx from:
 *      const initialView = window.location.pathname === '/dashboard'
 *        ? <DashboardApp/>
 *        : <LandingPage/>;
 *
 *      to:
 *      function Root() {
 *        const [token, setToken] = useState(() => localStorage.getItem('ca_token'));
 *        const handleAuth = (tok) => { localStorage.setItem('ca_token', tok); setToken(tok); };
 *        const handleLogout = () => { localStorage.removeItem('ca_token'); setToken(null); };
 *        if (window.location.pathname === '/dashboard') {
 *          return token ? <DashboardApp token={token} onLogout={handleLogout}/> : <AuthPage onAuthSuccess={handleAuth}/>;
 *        }
 *        return <LandingPage/>;
 *      }
 *      createRoot(document.getElementById('root')).render(<Root/>);
 *
 *   3. In DashboardApp, pass the token on all fetch calls as:
 *      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${props.token}` }
 *
 *   4. In the Logout button handler (main.jsx line ~54), call props.onLogout() instead of notify().
 *
 * All other frontend files remain UNCHANGED.
 */

const API = 'http://localhost:5000/api';

export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setSuccess('');
    setForm({ email: '', password: '', displayName: '' });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'register' && form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!form.password) {
      setError('Password is required.');
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const body =
        mode === 'register'
          ? { email: form.email.trim(), password: form.password, displayName: form.displayName.trim() }
          : { email: form.email.trim(), password: form.password };

      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      // Success — pass token up to parent
      setSuccess(mode === 'login' ? 'Signed in successfully!' : 'Account created! Signing you in…');
      setTimeout(() => onAuthSuccess(data.token, data.user), 600);
    } catch {
      setError('Could not reach the server. Make sure the backend is running on port 5000.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* Background grid decoration — matches landing page aesthetic */}
      <div className="auth-backdrop" aria-hidden="true" />

      <div className="auth-card">
        {/* Brand header */}
        <div className="auth-brand">
          <img src="/assets/cyber-shield-ai-logo.png" alt="CYBER-AGENT AI" />
        </div>

        {/* Mode toggle */}
        <div className="auth-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => switchMode('login')}
          >
            Sign In
          </button>
          <button
            role="tab"
            aria-selected={mode === 'register'}
            className={mode === 'register' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => switchMode('register')}
          >
            Create Account
          </button>
        </div>

        <form className="auth-form" onSubmit={submit} noValidate>
          <h1 className="auth-heading">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="auth-sub">
            {mode === 'login'
              ? 'Sign in to your CYBER-AGENT AI workspace.'
              : 'Register to start your AI-powered security workspace.'}
          </p>

          {/* Display name — register only */}
          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-name">Display name</label>
              <div className="auth-input-wrap">
                <User size={16} />
                <input
                  id="auth-name"
                  type="text"
                  placeholder="Your name (optional)"
                  autoComplete="name"
                  value={form.displayName}
                  onChange={update('displayName')}
                  maxLength={100}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="auth-field">
            <label htmlFor="auth-email">Email address</label>
            <div className="auth-input-wrap">
              <Mail size={16} />
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                autoComplete={mode === 'login' ? 'email' : 'email'}
                value={form.email}
                onChange={update('email')}
                required
                maxLength={254}
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-field">
            <label htmlFor="auth-password">
              Password
              {mode === 'register' && <small> — minimum 8 characters</small>}
            </label>
            <div className="auth-input-wrap">
              <LockKeyhole size={16} />
              <input
                id="auth-password"
                type={showPw ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Create a strong password' : 'Your password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={form.password}
                onChange={update('password')}
                required
                maxLength={128}
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="auth-error" role="alert">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="auth-success" role="status">
              <Check size={15} />
              <span>{success}</span>
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy
              ? mode === 'login' ? 'Signing in…' : 'Creating account…'
              : mode === 'login' ? <>Sign In <ArrowRight size={16} /></> : <>Create Account <ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="auth-footer">
          <Shield size={13} />
          <span>Passwords are hashed with bcrypt. Credentials are never stored in plain text.</span>
        </div>

        {/* Back to landing */}
        <button
          className="auth-back"
          onClick={() => { window.location.href = '/'; }}
        >
          <X size={14} /> Back to home
        </button>
      </div>
    </div>
  );
}
