import { useState } from 'react';
import { api } from './api.js';

const hue = (s) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;

const BACKDROP_TITLES = [
  'Night Signal', 'Glass Coast', '低 Season', 'The Long Way', 'Paper Moons',
  'Static & Sea', 'Ember Trail', 'Quiet Machines', 'Afterglow', 'Blue Hour',
  'Salt & Static', 'The Wide Open', 'Echo Park', 'Nine Lives', 'Faultline',
  'Marigold', 'The Last Reel', 'North of Nowhere',
];

function BackdropTile({ title }) {
  const h = hue(title);
  return (
    <div
      className="auth-tile"
      style={{ background: `linear-gradient(160deg, hsl(${h} 55% 38%), hsl(${(h + 60) % 360} 45% 14%))` }}
    >
      <span>{title}</span>
    </div>
  );
}

function PasswordField({ value, onChange, onEnter }) {
  const [show, setShow] = useState(false);
  return (
    <label className="field">
      <span>Password</span>
      <div className="field-input">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onKeyDown={(e) => e.key === 'Enter' && onEnter()}
          autoComplete="current-password"
          required
        />
        <button type="button" className="reveal" onClick={() => setShow((s) => !s)}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
    </label>
  );
}

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setErr('');
    setBusy(true);
    try {
      onAuth(await api(`/auth/${mode}`, { method: 'POST', body: { email, password } }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-backdrop" aria-hidden="true">
        <div className="auth-tiles">
          {[...BACKDROP_TITLES, ...BACKDROP_TITLES].map((t, i) => (
            <BackdropTile key={i} title={t} />
          ))}
        </div>
        <div className="auth-scrim">
          <span className="logo">Reelhouse</span>
          <p>Everything you're looking for, and a few things you weren't.</p>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-switch" role="tablist" aria-label="Choose login or create account">
            <button
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'on' : ''}
              onClick={() => { setMode('login'); setErr(''); }}
            >
              Log in
            </button>
            <button
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'on' : ''}
              onClick={() => { setMode('register'); setErr(''); }}
            >
              Create account
            </button>
          </div>

          <h2>{mode === 'login' ? 'Welcome back' : "Let's get you set up"}</h2>
          <p className="auth-sub">
            {mode === 'login' ? 'Log in to pick up where you left off.' : 'Takes about ten seconds.'}
          </p>

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} onEnter={submit} />

          {err && <p className="error" role="alert">{err}</p>}

          <button className="btn auth-submit" onClick={submit} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  );
}