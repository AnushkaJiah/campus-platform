import React, { useState, useEffect, useCallback } from 'react';
import './index.css';
import AdminView from './components/AdminView';
import StudentView from './components/StudentView';
import BookingsView from './components/BookingsView';
import MaintenanceView from './components/MaintenanceView';
import NotificationBell from './components/NotificationBell';
import Login from './components/Login';
import { CrestIcon } from './icons';
import { loadSession, saveSession, clearSession, SESSION_EXPIRED_EVENT } from './auth';

function App() {
  const [session, setSession] = useState(() => loadSession());
  const [view, setView] = useState('admin');

  const isAdmin = session?.role === 'ADMIN';

  // What each role can open. Students never get the admin dashboard.
  const navItems = isAdmin
    ? [
        { key: 'admin', label: 'Dashboard' },
        { key: 'student', label: 'Find a space' },
        { key: 'bookings', label: 'Bookings' },
        { key: 'maintenance', label: 'Maintenance' },
      ]
    : [
        { key: 'student', label: 'Find a space' },
        { key: 'bookings', label: 'My bookings' },
        { key: 'maintenance', label: 'Maintenance' },
      ];
  const activeView = navItems.some((item) => item.key === view) ? view : navItems[0].key;

  const subtitles = {
    admin: 'Resource & energy monitoring',
    student: 'Find an available space',
    bookings: isAdmin ? 'Review and manage booking requests' : 'Your reservations',
    maintenance: isAdmin ? 'Track and resolve reported problems' : 'Report a problem and follow the repair',
  };

  const handleLogin = (newSession) => {
    saveSession(newSession);
    setSession(newSession);
    setView(newSession.role === 'ADMIN' ? 'admin' : 'student');
  };

  const handleLogout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  // The API layer fires this when the server rejects our token (e.g. it expired).
  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, handleLogout);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleLogout);
  }, [handleLogout]);

  if (!session) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__crest">
            <CrestIcon />
          </span>
          <div>
            <p className="app-header__eyebrow">Office of Campus Operations</p>
            <h1 className="app-header__title">Smart Campus</h1>
            <p className="app-header__subtitle">{subtitles[activeView]}</p>
          </div>
        </div>
        <div className="app-header__actions">
          <div className="view-toggle">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={`view-toggle__button ${activeView === item.key ? 'view-toggle__button--active' : ''}`}
                onClick={() => setView(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <NotificationBell
            onNavigate={(target) => {
              if (navItems.some((item) => item.key === target)) setView(target);
            }}
          />
          <div className="user-chip">
            <span className="user-chip__avatar">{(session.name || '?').charAt(0).toUpperCase()}</span>
            <span className="user-chip__text">
              <span className="user-chip__name">{session.name}</span>
              <span className="user-chip__role">{isAdmin ? 'Administrator' : 'Student'}</span>
            </span>
            <button className="user-chip__logout" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {activeView === 'admin' && <AdminView />}
        {activeView === 'student' && <StudentView />}
        {activeView === 'bookings' && <BookingsView isAdmin={isAdmin} />}
        {activeView === 'maintenance' && <MaintenanceView isAdmin={isAdmin} />}
      </main>

      <footer className="app-footer">
        <p className="app-footer__text">Smart Campus Resource Management Platform</p>
        <span className="app-footer__badge">
          <span className="connection-indicator__dot" style={{ width: 6, height: 6 }}></span>
          Live data
        </span>
      </footer>
    </div>
  );
}

export default App;
