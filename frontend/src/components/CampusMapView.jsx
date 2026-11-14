import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api';
import { SpaceIcon } from '../icons';

const POLL_INTERVAL_MS = 5000;

const typeLabels = {
  CLASSROOM: 'Classroom',
  LAB: 'Laboratory',
  STUDY_SPACE: 'Study space',
  FACILITY: 'Facility',
};

const alertLabels = {
  OVERCROWDING: 'Overcrowded',
  ENVIRONMENTAL: 'Environment alert',
  ENERGY_WASTE: 'Energy waste',
};

const bandLabels = {
  none: 'No data',
  low: 'Under-used',
  ok: 'Well used',
  high: 'Crowded',
};

// Same thresholds as the analytics ranking, so the map and the charts agree.
function bandFor(percent) {
  if (percent == null) return 'none';
  if (percent < 30) return 'low';
  if (percent > 85) return 'high';
  return 'ok';
}

function utilizationPercent(resource, reading) {
  if (!reading || !resource.capacity || resource.capacity <= 0) return null;
  if (reading.occupancyCount == null) return null;
  return Math.round((reading.occupancyCount / resource.capacity) * 100);
}

// Buildings are listed alphabetically; inside each one the top floor is drawn
// first, like looking at a cut-away of the building.
function layoutBuildings(resources) {
  const buildings = new Map();
  resources.forEach((r) => {
    const key = r.building?.id ?? 'unassigned';
    if (!buildings.has(key)) {
      buildings.set(key, { id: key, building: r.building, floors: new Map() });
    }
    const floor = r.floor ?? 0;
    const entry = buildings.get(key);
    if (!entry.floors.has(floor)) entry.floors.set(floor, []);
    entry.floors.get(floor).push(r);
  });

  return Array.from(buildings.values())
    .sort((a, b) => (a.building?.name || '').localeCompare(b.building?.name || ''))
    .map((entry) => ({
      ...entry,
      floors: Array.from(entry.floors.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([floor, rooms]) => ({
          floor,
          rooms: rooms.sort((a, b) => a.name.localeCompare(b.name)),
        })),
    }));
}

function floorLabel(floor) {
  return floor === 0 ? 'G' : `F${floor}`;
}

export default function CampusMapView() {
  const [resources, setResources] = useState([]);
  const [readings, setReadings] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('plan'); // 'plan' (flat) or '3d' (stacked floors)
  const [connectionOk, setConnectionOk] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await api.getResources();
      setResources(list);
      const entries = await Promise.all(
        list.map(async (r) => [r.id, await api.getLatestReading(r.id)])
      );
      setReadings(Object.fromEntries(entries));
      setAlerts(await api.getActiveAlerts());
      setConnectionOk(true);
    } catch (err) {
      setConnectionOk(false);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const layout = useMemo(() => layoutBuildings(resources), [resources]);

  const alertsByResource = useMemo(() => {
    const map = new Map();
    alerts.forEach((a) => {
      const id = a.resource?.id;
      if (id == null) return;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(a);
    });
    return map;
  }, [alerts]);

  const summary = useMemo(() => {
    const counts = { low: 0, ok: 0, high: 0, none: 0 };
    let occupied = 0;
    let capacity = 0;
    resources.forEach((r) => {
      const reading = readings[r.id];
      counts[bandFor(utilizationPercent(r, reading))] += 1;
      if (reading && r.capacity > 0 && reading.occupancyCount != null) {
        occupied += reading.occupancyCount;
        capacity += r.capacity;
      }
    });
    return {
      counts,
      campusPercent: capacity > 0 ? Math.round((occupied / capacity) * 100) : null,
      people: occupied,
    };
  }, [resources, readings]);

  const tileMeta = (room) => {
    const reading = readings[room.id];
    const percent = utilizationPercent(room, reading);
    const band = bandFor(percent);
    const roomAlerts = alertsByResource.get(room.id) || [];
    return {
      reading,
      percent,
      band,
      hasAlert: roomAlerts.length > 0,
      selected: room.id === selectedId,
      label: `${room.name}, ${bandLabels[band]}${percent != null ? `, ${percent} percent` : ''}${roomAlerts.length ? ', has an active alert' : ''}`,
      toggle: () => setSelectedId(room.id === selectedId ? null : room.id),
    };
  };

  const selected = resources.find((r) => r.id === selectedId) || null;
  const selectedReading = selected ? readings[selected.id] : null;
  const selectedPercent = selected ? utilizationPercent(selected, selectedReading) : null;
  const selectedAlerts = selected ? alertsByResource.get(selected.id) || [] : [];

  return (
    <div className="campus-map">
      {!connectionOk && (
        <div className="notice notice--error" role="alert">
          Cannot reach the server. The map shows the last data it received.
        </div>
      )}

      <section className="map-summary" aria-label="Campus summary">
        <div className="map-stat">
          <span className="map-stat__value">
            {summary.campusPercent == null ? '–' : `${summary.campusPercent}%`}
          </span>
          <span className="map-stat__label">Campus utilization now</span>
        </div>
        <div className="map-stat">
          <span className="map-stat__value">{summary.people}</span>
          <span className="map-stat__label">People in monitored spaces</span>
        </div>
        <div className="map-stat">
          <span className="map-stat__value">{summary.counts.high}</span>
          <span className="map-stat__label">Crowded spaces</span>
        </div>
        <div className="map-stat">
          <span className="map-stat__value">{alerts.length}</span>
          <span className="map-stat__label">Active alerts</span>
        </div>
      </section>

      <div className="map-toolbar">
        <div className="map-modes" role="group" aria-label="Map style">
          <button type="button" className={`map-modes__btn${mode === 'plan' ? ' map-modes__btn--on' : ''}`} aria-pressed={mode === 'plan'} onClick={() => setMode('plan')}>Floor plan</button>
          <button type="button" className={`map-modes__btn${mode === '3d' ? ' map-modes__btn--on' : ''}`} aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>3D view</button>
        </div>
        {mode === '3d' && <span className="map-toolbar__hint">Taller block = fuller space</span>}
      </div>
      <ul className="band-legend map-legend" aria-label="Colour key">
        <li><span className="band-dot band-dot--low" />Under-used (below 30%)</li>
        <li><span className="band-dot band-dot--ok" />Well used</li>
        <li><span className="band-dot band-dot--high" />Crowded (above 85%)</li>
        <li><span className="band-dot band-dot--none" />No reading yet</li>
        <li><span className="map-legend__ring" />Ring = active alert</li>
      </ul>

      <div className="map-layout">
        <div className="map-buildings">
          {loaded && layout.length === 0 && (
            <p className="empty-note">No spaces have been added yet.</p>
          )}
          {layout.map((entry) => (
            <section className="map-building" key={entry.id}>
              <header className="map-building__header">
                <h3 className="map-building__name">{entry.building?.name || 'Unassigned'}</h3>
                {entry.building?.code && <span className="map-building__code">{entry.building.code}</span>}
              </header>
              {mode === '3d' ? (
                <div className="iso-stage" style={{ '--floors': entry.floors.length }}>
                  <div
                    className="iso-world"
                    style={{ '--cols': Math.min(3, Math.max(...entry.floors.map((f) => f.rooms.length))) }}
                  >
                    {entry.floors
                      .slice()
                      .reverse()
                      .map(({ floor, rooms }, level) => (
                        <div className="iso-plate" key={floor} style={{ '--lvl': level }}>
                          <span className="iso-plate__label">{floorLabel(floor)}</span>
                          {rooms.map((room) => {
                            const m = tileMeta(room);
                            const height = m.percent == null ? 8 : 12 + Math.min(m.percent, 120) * 0.42;
                            return (
                              <button
                                type="button"
                                key={room.id}
                                className={`iso-block iso-block--${m.band}${m.hasAlert ? ' iso-block--alert' : ''}${m.selected ? ' iso-block--selected' : ''}`}
                                style={{ '--h': `${height}px` }}
                                aria-pressed={m.selected}
                                aria-label={m.label}
                                title={`${room.name}${m.percent != null ? ` · ${m.percent}%` : ''}`}
                                onClick={m.toggle}
                              >
                                <span className="iso-block__icon" aria-hidden="true"><SpaceIcon resource={room} width={20} height={20} /></span>
                                <span className="iso-block__flag" aria-hidden="true"><span className="iso-block__name">{room.name}</span></span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                entry.floors.map(({ floor, rooms }) => (
                  <div className="map-floor" key={floor}>
                    <span className="map-floor__label" title={floor === 0 ? 'Ground floor' : `Floor ${floor}`}>
                      {floorLabel(floor)}
                    </span>
                    <div className="map-floor__rooms">
                      {rooms.map((room) => {
                        const m = tileMeta(room);
                        const classes = [
                          'map-tile',
                          `map-tile--${m.band}`,
                          m.hasAlert ? 'map-tile--alert' : '',
                          m.selected ? 'map-tile--selected' : '',
                        ].join(' ');
                        return (
                          <button
                            type="button"
                            key={room.id}
                            className={classes}
                            aria-pressed={m.selected}
                            aria-label={m.label}
                            onClick={m.toggle}
                          >
                            <span className="map-tile__top">
                              <span className="map-tile__icon" aria-hidden="true"><SpaceIcon resource={room} width={18} height={18} /></span>
                              <span className="map-tile__name">{room.name}</span>
                            </span>
                            <span className="map-tile__count">
                              {m.reading && m.reading.occupancyCount != null
                                ? `${m.reading.occupancyCount} / ${room.capacity ?? '?'}`
                                : 'No data'}
                            </span>
                            <span className="map-tile__bar" aria-hidden="true">
                              <span className="map-tile__fill" style={{ width: `${Math.min(m.percent ?? 0, 100)}%` }} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </section>
          ))}
        </div>

        <aside className="map-detail" aria-live="polite">
          {!selected && (
            <>
              <h3 className="map-detail__title">Space details</h3>
              <p className="map-detail__hint">
                Select a space on the map to see its occupancy, temperature, energy use and alerts.
              </p>
            </>
          )}
          {selected && (
            <>
              <h3 className="map-detail__title">{selected.name}</h3>
              <p className="map-detail__meta">
                {selected.building?.name} · {floorLabel(selected.floor ?? 0) === 'G' ? 'Ground floor' : `Floor ${selected.floor}`} ·{' '}
                {typeLabels[selected.type] || selected.type}
              </p>
              <p className={`map-detail__badge map-detail__badge--${bandFor(selectedPercent)}`}>
                {bandLabels[bandFor(selectedPercent)]}
                {selectedPercent != null ? ` · ${selectedPercent}%` : ''}
              </p>
              <dl className="map-detail__list">
                <div><dt>Occupancy</dt><dd>{selectedReading?.occupancyCount ?? '–'} of {selected.capacity ?? '–'}</dd></div>
                <div><dt>Temperature</dt><dd>{selectedReading?.temperatureCelsius != null ? `${Number(selectedReading.temperatureCelsius).toFixed(1)} °C` : '–'}</dd></div>
                <div><dt>Energy (last reading)</dt><dd>{selectedReading?.energyConsumptionKwh != null ? `${Number(selectedReading.energyConsumptionKwh).toFixed(2)} kWh` : '–'}</dd></div>
                <div><dt>Space status</dt><dd>{(selected.status || '').toLowerCase().replace('_', ' ') || '–'}</dd></div>
              </dl>
              {selectedAlerts.length > 0 ? (
                <ul className="map-detail__alerts">
                  {selectedAlerts.map((a) => (
                    <li key={a.id}>
                      <strong>{alertLabels[a.type] || a.type}</strong>
                      {a.message && <span>{a.message}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="map-detail__hint">No active alerts for this space.</p>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
