import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { TypeIcon, PinIcon, WrenchIcon } from '../icons';
import ReportModal from './ReportModal';

const POLL_INTERVAL_MS = 8000;

const STATUS_TONE = { OPEN: 'critical', IN_PROGRESS: 'warning', RESOLVED: 'good' };
const STATUS_LABEL = { OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Fixed' };
const PRIORITY_TONE = { HIGH: 'critical', MEDIUM: 'warning', LOW: 'neutral' };
const PRIORITY_LABEL = { HIGH: 'Urgent', MEDIUM: 'Medium', LOW: 'Low' };

const TABS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ALL'];

function formatWhen(iso) {
  return new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function MaintenanceView({ isAdmin }) {
  const [reports, setReports] = useState([]);
  const [tab, setTab] = useState(isAdmin ? 'OPEN' : 'ALL');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setReports(isAdmin ? await api.getAllMaintenance() : await api.getMyMaintenance());
    } catch (err) {
      // keep the last list if the backend hiccups
    } finally {
      setLoaded(true);
    }
  }, [isAdmin]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const counts = useMemo(() => {
    const result = { ALL: reports.length };
    TABS.forEach((t) => {
      if (t !== 'ALL') result[t] = reports.filter((r) => r.status === t).length;
    });
    return result;
  }, [reports]);

  const visible = tab === 'ALL' ? reports : reports.filter((r) => r.status === tab);

  const setStatus = async (report, status, note) => {
    setError('');
    try {
      await api.updateMaintenanceStatus(report.id, status, note);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'That did not work. Please try again.');
      refresh();
    }
  };

  const handleStart = (r) => setStatus(r, 'IN_PROGRESS');
  const handleReopen = (r) => setStatus(r, 'OPEN');
  const handleFix = (r) => {
    const note = window.prompt(`Mark "${r.title}" as fixed?\nOptional note for ${r.reporterName}:`, '');
    if (note === null) return; // the admin pressed Cancel
    setStatus(r, 'RESOLVED', note);
  };

  return (
    <section>
      <div className="section-head">
        <h2 className="section-title">{isAdmin ? 'Maintenance requests' : 'My reports'}</h2>
        <span className="section-count">
          {isAdmin ? `${counts.OPEN} waiting for attention` : `${reports.length} in total`}
        </span>
      </div>

      <div className="toolbar-row toolbar-row--split">
        <div className="filter-tabs booking-tabs">
          {TABS.map((t) => (
            <button key={t} className={`filter-tab ${tab === t ? 'filter-tab--active' : ''}`} onClick={() => setTab(t)}>
              {t === 'ALL' ? 'All' : STATUS_LABEL[t]} ({counts[t] ?? 0})
            </button>
          ))}
        </div>
        <button className="btn btn--primary" onClick={() => setShowModal(true)}>
          <WrenchIcon width={15} height={15} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Report a problem
        </button>
      </div>

      {notice && (
        <div className="notice notice--success" role="status">
          <span>{notice}</span>
          <button className="notice__close" onClick={() => setNotice('')} aria-label="Dismiss">×</button>
        </div>
      )}
      {error && (
        <div className="notice notice--error" role="alert">
          <span>{error}</span>
          <button className="notice__close" onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {loaded && visible.length === 0 ? (
        <p className="empty-state">
          {isAdmin
            ? tab === 'OPEN'
              ? 'Nothing is waiting. Everything on campus is in working order.'
              : 'No reports here.'
            : 'You have not reported anything yet. Press "Report a problem" if something is broken.'}
        </p>
      ) : (
        <ul className="booking-list">
          {visible.map((r) => (
            <li key={r.id} className={`booking-row booking-row--${STATUS_TONE[r.status]}`}>
              <span className={`card-icon card-icon--${r.resourceType}`}>
                <TypeIcon type={r.resourceType} />
              </span>

              <div className="booking-row__main">
                <h3 className="booking-row__name">{r.title}</h3>
                <p className="booking-row__time">
                  {r.resourceName}
                  <span className={`status-pill status-pill--${PRIORITY_TONE[r.priority]} priority-pill`}>
                    {PRIORITY_LABEL[r.priority]}
                  </span>
                </p>
                {r.description && <p className="booking-row__desc">{r.description}</p>}
                <p className="booking-row__meta">
                  <PinIcon /> {r.buildingName}
                  {isAdmin && <span> · reported by {r.reporterName} ({r.reporterEmail})</span>}
                  <span> · {formatWhen(r.createdAt)}</span>
                </p>
                {r.adminNote && <p className="booking-row__note">Note from the facilities team: {r.adminNote}</p>}
              </div>

              <div className="booking-row__side">
                <span className={`status-pill status-pill--${STATUS_TONE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                {isAdmin && (
                  <div className="booking-row__actions">
                    {r.status === 'OPEN' && (
                      <button className="btn btn--primary btn--small" onClick={() => handleStart(r)}>Start work</button>
                    )}
                    {r.status !== 'RESOLVED' && (
                      <button className="btn btn--ghost btn--small" onClick={() => handleFix(r)}>Mark fixed</button>
                    )}
                    {r.status !== 'OPEN' && (
                      <button className="btn btn--ghost btn--small" onClick={() => handleReopen(r)}>Reopen</button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showModal && (
        <ReportModal
          onClose={() => setShowModal(false)}
          onCreated={(report) => {
            setShowModal(false);
            setNotice(`Report sent for ${report.resourceName}. The facilities team has been notified.`);
            setTab('ALL');
            refresh();
          }}
        />
      )}
    </section>
  );
}
