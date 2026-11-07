import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { BellIcon } from '../icons';

const POLL_INTERVAL_MS = 10000;

function timeAgo(iso) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function NotificationBell({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ unread: 0, items: [] });
  const wrapperRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      setData(await api.getNotifications());
    } catch (err) {
      // keep what we have if the backend hiccups
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  // Close the panel when clicking elsewhere or pressing Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (!open) refresh();
    setOpen((o) => !o);
  };

  const handleItem = async (n) => {
    if (!n.seen) {
      try {
        await api.markNotificationRead(n.id);
      } catch (err) {
        // not critical
      }
    }
    setOpen(false);
    onNavigate(n.target);
    refresh();
  };

  const handleReadAll = async () => {
    try {
      await api.markAllNotificationsRead();
    } catch (err) {
      // not critical
    }
    refresh();
  };

  return (
    <div className="bell" ref={wrapperRef}>
      <button
        className="bell__button"
        onClick={toggle}
        aria-label={data.unread > 0 ? `Notifications, ${data.unread} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <BellIcon />
        {data.unread > 0 && <span className="bell__badge">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>

      {open && (
        <div className="bell__panel" role="dialog" aria-label="Notifications">
          <div className="bell__panel-head">
            <span className="bell__panel-title">Notifications</span>
            {data.unread > 0 && (
              <button className="bell__link" onClick={handleReadAll}>Mark all as read</button>
            )}
          </div>
          {data.items.length === 0 ? (
            <p className="bell__empty">You are all caught up.</p>
          ) : (
            <ul className="bell__list">
              {data.items.map((n) => (
                <li key={n.id}>
                  <button
                    className={`bell__item ${n.seen ? '' : 'bell__item--unread'}`}
                    onClick={() => handleItem(n)}
                  >
                    <span className="bell__message">{n.message}</span>
                    <span className="bell__time">{timeAgo(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
