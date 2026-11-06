import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { formatRange } from '../datetime';
import { TypeIcon, PinIcon } from '../icons';

const POLL_INTERVAL_MS = 8000;

const STATUS_TONE = {
  PENDING: 'warning',
  APPROVED: 'good',
  REJECTED: 'critical',
  CANCELLED: 'neutral',
};

const STATUS_LABEL = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

const TABS = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ALL'];

export default function BookingsView({ isAdmin }) {
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState(isAdmin ? 'PENDING' : 'ALL');
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setBookings(isAdmin ? await api.getAllBookings() : await api.getMyBookings());
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
    const result = { ALL: bookings.length };
    TABS.forEach((t) => {
      if (t !== 'ALL') result[t] = bookings.filter((b) => b.status === t).length;
    });
    return result;
  }, [bookings]);

  const visible = tab === 'ALL' ? bookings : bookings.filter((b) => b.status === tab);

  const run = async (action) => {
    setError('');
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err.response?.data?.message || 'That did not work. Please try again.');
      refresh();
    }
  };

  const handleApprove = (b) => run(() => api.approveBooking(b.id));

  const handleReject = (b) => {
    const note = window.prompt(`Reject ${b.userName}'s request for ${b.resourceName}?\nOptional reason:`, '');
    if (note === null) return; // the admin pressed Cancel
    run(() => api.rejectBooking(b.id, note));
  };

  const handleCancel = (b) => {
    if (!window.confirm(`Cancel the booking for ${b.resourceName}?`)) return;
    run(() => api.cancelBooking(b.id));
  };

  const canCancel = (b) =>
    (b.status === 'PENDING' || b.status === 'APPROVED') && new Date(b.endTime) > new Date();

  return (
    <section>
      <div className="section-head">
        <h2 className="section-title">{isAdmin ? 'Booking requests' : 'My bookings'}</h2>
        <span className="section-count">
          {isAdmin ? `${counts.PENDING} waiting for a decision` : `${bookings.length} in total`}
        </span>
      </div>

      <div className="filter-tabs booking-tabs">
        {TABS.map((t) => (
          <button key={t} className={`filter-tab ${tab === t ? 'filter-tab--active' : ''}`} onClick={() => setTab(t)}>
            {t === 'ALL' ? 'All' : STATUS_LABEL[t]} ({counts[t] ?? 0})
          </button>
        ))}
      </div>

      {error && (
        <div className="notice notice--error" role="alert">
          <span>{error}</span>
          <button className="notice__close" onClick={() => setError('')} aria-label="Dismiss">×</button>
        </div>
      )}

      {loaded && visible.length === 0 ? (
        <p className="empty-state">
          {tab === 'PENDING' && isAdmin
            ? 'No requests are waiting. Nice and quiet.'
            : isAdmin
            ? 'No bookings here.'
            : 'No bookings here yet. Use "Find a space" and press "Book this space".'}
        </p>
      ) : (
        <ul className="booking-list">
          {visible.map((b) => (
            <li key={b.id} className={`booking-row booking-row--${STATUS_TONE[b.status]}`}>
              <span className={`card-icon card-icon--${b.resourceType}`}>
                <TypeIcon type={b.resourceType} />
              </span>

              <div className="booking-row__main">
                <h3 className="booking-row__name">{b.resourceName}</h3>
                <p className="booking-row__time">{formatRange(b.startTime, b.endTime)}</p>
                <p className="booking-row__meta">
                  <PinIcon /> {b.buildingName}
                  {isAdmin && <span> · {b.userName} ({b.userEmail})</span>}
                  {b.purpose && <span> · {b.purpose}</span>}
                </p>
                {b.decisionNote && <p className="booking-row__note">Admin note: {b.decisionNote}</p>}
              </div>

              <div className="booking-row__side">
                <span className={`status-pill status-pill--${STATUS_TONE[b.status]}`}>{STATUS_LABEL[b.status]}</span>
                <div className="booking-row__actions">
                  {isAdmin && b.status === 'PENDING' && (
                    <>
                      <button className="btn btn--primary btn--small" onClick={() => handleApprove(b)}>Approve</button>
                      <button className="btn btn--danger btn--small" onClick={() => handleReject(b)}>Reject</button>
                    </>
                  )}
                  {canCancel(b) && !(isAdmin && b.status === 'PENDING') && (
                    <button className="btn btn--ghost btn--small" onClick={() => handleCancel(b)}>Cancel</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
