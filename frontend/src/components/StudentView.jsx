import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api';
import StudentCard from './StudentCard';
import BookingModal from './BookingModal';

const POLL_INTERVAL_MS = 5000;

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'CLASSROOM', label: 'Classrooms' },
  { key: 'LAB', label: 'Labs' },
  { key: 'STUDY_SPACE', label: 'Study spaces' },
  { key: 'FACILITY', label: 'Facilities' },
];

function groupByBuilding(resources) {
  const groups = new Map();
  resources.forEach((r) => {
    const key = r.building?.id ?? 'unassigned';
    if (!groups.has(key)) groups.set(key, { building: r.building, resources: [] });
    groups.get(key).resources.push(r);
  });
  return Array.from(groups.values()).sort((a, b) =>
    (a.building?.name || '').localeCompare(b.building?.name || '')
  );
}

export default function StudentView() {
  const [resources, setResources] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [bookingResource, setBookingResource] = useState(null);
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    try {
      const resourceList = await api.getResources();
      setResources(resourceList);
    } catch (err) {
      // stay on last-known list if the backend hiccups
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const visible = resources.filter((r) => {
    if (filter !== 'ALL' && r.type !== filter) return false;
    if (onlyAvailable && r.status !== 'AVAILABLE') return false;
    return true;
  });

  const buildingGroups = useMemo(() => groupByBuilding(visible), [visible]);

  return (
    <>
      {notice && (
        <div className="notice notice--success" role="status">
          <span>{notice}</span>
          <button className="notice__close" onClick={() => setNotice('')} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="student-controls">
        <div className="filter-tabs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter-tab ${filter === f.key ? 'filter-tab--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="availability-toggle">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
          />
          Show available only
        </label>
      </div>

      <section>
        <h2 className="section-title">{visible.length} space{visible.length === 1 ? '' : 's'} found</h2>
        {visible.length === 0 ? (
          <p className="empty-state">Nothing matches right now — try a different filter.</p>
        ) : (
          buildingGroups.map(({ building, resources: buildingResources }) => (
            <div className="building-section" key={building?.id ?? 'unassigned'}>
              <div className="building-section__header">
                <h3 className="building-section__name">{building?.name || 'Unassigned'}</h3>
                <p className="building-section__meta">
                  {building?.code}{building?.location ? ` · ${building.location}` : ''}
                </p>
              </div>
              <div className="student-grid">
                {buildingResources.map((resource) => (
                  <StudentCard key={resource.id} resource={resource} onBook={setBookingResource} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {bookingResource && (
        <BookingModal
          resource={bookingResource}
          onClose={() => setBookingResource(null)}
          onBooked={(booking) => {
            setBookingResource(null);
            setNotice(
              booking.status === 'APPROVED'
                ? `${booking.resourceName} is booked.`
                : `Request sent for ${booking.resourceName}. You will see it under My bookings once an admin decides.`
            );
          }}
        />
      )}
    </>
  );
}
