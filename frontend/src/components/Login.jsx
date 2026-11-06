import React, { useState } from 'react';
import { api } from '../api';
import { CrestIcon } from '../icons';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session = isRegister
        ? await api.register(name, email, password)
        : await api.login(email, password);
      onLogin(session);
    } catch (err) {
      if (!err.response) {
        setError('Cannot reach the server. Is the backend running?');
      } else {
        setError(err.response.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <aside className="login-hero">
        <span className="login-hero__crest"><CrestIcon /></span>
        <p className="login-hero__eyebrow">Office of Campus Operations</p>
        <h1 className="login-hero__title">Smart Campus</h1>
        <p className="login-hero__text">
          Live room availability, energy monitoring and alerts for every building on campus.
        </p>
        <ul className="login-hero__points">
          <li>Students find a free classroom, lab or study space in seconds</li>
          <li>Administrators watch occupancy, climate and energy in real time</li>
        </ul>
      </aside>

      <main className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2 className="login-card__title">{isRegister ? 'Create student account' : 'Welcome back'}</h2>
          <p className="login-card__subtitle">
            {isRegister ? 'Sign up to browse available spaces.' : 'Sign in to continue to your dashboard.'}
          </p>

          {isRegister && (
            <label className="field">
              <span className="field__label">Full name</span>
              <input
                className="field__input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
          )}

          <label className="field">
            <span className="field__label">Email</span>
            <input
              className="field__input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span className="field__label">Password</span>
            <input
              className="field__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 6 : undefined}
              required
            />
          </label>

          {error && <p className="login-card__error" role="alert">{error}</p>}

          <button className="login-card__submit" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>

          <p className="login-card__switch">
            {isRegister ? 'Already have an account?' : 'New student?'}{' '}
            <button type="button" className="link-button" onClick={() => switchMode(isRegister ? 'login' : 'register')}>
              {isRegister ? 'Sign in' : 'Create an account'}
            </button>
          </p>

          {!isRegister && (
            <div className="login-card__demo">
              <p className="login-card__demo-title">Demo accounts</p>
              <p>Admin: admin@campus.edu / admin123</p>
              <p>Student: student@campus.edu / student123</p>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
