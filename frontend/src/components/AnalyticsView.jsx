import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { LineChart, ColumnChart } from './charts';
import { UsersIcon, BoltIcon, AlertIcon, CheckIcon, TypeIcon } from '../icons';

const POLL_INTERVAL_MS = 20000;
const RANGES = [7, 14, 30];

const ALERT_LABEL = { OVERCROWDING: 'Overcrowding', ENVIRONMENTAL: 'Environment', ENERGY_WASTE: 'Energy waste' };

const pct = (v) => (v == null ? '—' : `${v}%`);
const hourLabel = (h) => `${String(h % 24).padStart(2, '0')}:00`;
const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' });

// Bands for the room ranking. The label always sits next to the colour, so colour is never the only cue.
function band(util) {
  if (util == null) return { key: 'none', label: 'No data' };
  if (util < 30) return { key: 'low', label: 'Under-used' };
  if (util > 85) return { key: 'high', label: 'Crowded' };
  return { key: 'ok', label: 'Well used' };
}

function buildInsights(d) {
  const out = [];
  const hours = d.hourly.filter((h) => h.avgUtilizationPercent != null);
  if (hours.length) {
    const peak = hours.reduce((a, b) => (b.avgUtilizationPercent > a.avgUtilizationPercent ? b : a));
    out.push(`Busiest time of day is ${hourLabel(peak.hour)}–${hourLabel(peak.hour + 1)}, when spaces are on average ${peak.avgUtilizationPercent}% full.`);
    const teaching = hours.filter((h) => h.hour >= 8 && h.hour < 18);
    if (teaching.length > 1) {
      const low = teaching.reduce((a, b) => (b.avgUtilizationPercent < a.avgUtilizationPercent ? b : a));
      if (low.hour !== peak.hour) {
        out.push(`Quietest teaching hour is ${hourLabel(low.hour)}–${hourLabel(low.hour + 1)} (${low.avgUtilizationPercent}% full), a good slot for maintenance.`);
      }
    }
  }
  const rooms = d.rooms.filter((r) => r.avgUtilizationPercent != null);
  if (rooms.length > 1) {
    const top = rooms[0];
    const bottom = rooms[rooms.length - 1];
    out.push(`Most used space: ${top.name} (${top.avgUtilizationPercent}% on average).`);
    out.push(`Least used space: ${bottom.name} (${bottom.avgUtilizationPercent}%). Worth checking whether its AC and lights run while it is empty.`);
  }
  const energyRooms = rooms.filter((r) => r.energyKwh != null);
  if (energyRooms.length) {
    const hog = energyRooms.reduce((a, b) => (b.energyKwh > a.energyKwh ? b : a));
    out.push(`Highest energy use: ${hog.name} (${hog.energyKwh} kWh recorded).`);
  }
  const over = d.rooms.filter((r) => (r.peakUtilizationPercent || 0) > 100).length;
  if (over > 0) out.push(`${over} space${over === 1 ? '' : 's'} went over capacity at least once in this period.`);
  return out;
}

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="chart-card">
      <h3 className="chart-card__title">{title}</h3>
      {subtitle && <p className="chart-card__subtitle">{subtitle}</p>}
      {children}
    </section>
  );
}

export default function AnalyticsView() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [showTables, setShowTables] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.getAnalytics(days));
      setError(false);
    } catch (err) {
      setError(true);
    }
  }, [days]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const insights = useMemo(() => (data ? buildInsights(data) : []), [data]);

  const dailyUtil = useMemo(() => (data ? data.daily.map((d) => ({
    label: dayLabel(d.date), value: d.avgUtilizationPercent,
    tip: <><strong>{dayLabel(d.date)}</strong><span>{d.avgUtilizationPercent == null ? 'No data' : `${d.avgUtilizationPercent}% average fill`}</span></>,
  })) : []), [data]);

  const dailyEnergy = useMemo(() => (data ? data.daily.map((d) => ({
    label: dayLabel(d.date), value: d.energyKwh,
    tip: <><strong>{dayLabel(d.date)}</strong><span>{d.energyKwh == null ? 'No data' : `${d.energyKwh} kWh`}</span></>,
  })) : []), [data]);

  const hourly = useMemo(() => {
    if (!data) return [];
    const valid = data.hourly.filter((h) => h.avgUtilizationPercent != null);
    const peak = valid.length ? valid.reduce((a, b) => (b.avgUtilizationPercent > a.avgUtilizationPercent ? b : a)).hour : -1;
    return data.hourly.map((h) => ({
      label: String(h.hour), value: h.avgUtilizationPercent, highlight: h.hour === peak,
      tip: <><strong>{hourLabel(h.hour)}–{hourLabel(h.hour + 1)}</strong><span>{h.avgUtilizationPercent == null ? 'No data' : `${h.avgUtilizationPercent}% average fill`}</span></>,
    }));
  }, [data]);

  const alertMax = data ? Math.max(1, ...data.alerts.map((a) => a.count)) : 1;
  const roomMax = data ? Math.max(100, ...data.rooms.map((r) => r.avgUtilizationPercent || 0)) : 100;

  if (!data) {
    return (
      <p className="empty-state">
        {error ? 'Could not load analytics. Is the backend running?' : 'Loading analytics…'}
      </p>
    );
  }

  const empty = data.totals.readings === 0;

  return (
    <>
      <div className="toolbar-row toolbar-row--split">
        <div className="filter-tabs">
          {RANGES.map((r) => (
            <button key={r} className={`filter-tab ${days === r ? 'filter-tab--active' : ''}`} onClick={() => setDays(r)}>
              Last {r} days
            </button>
          ))}
        </div>
        <button className="btn btn--ghost btn--small" onClick={() => setShowTables((s) => !s)} aria-pressed={showTables}>
          {showTables ? 'Hide data tables' : 'View as tables'}
        </button>
      </div>

      <div className="stats-strip">
        <div className="stat-tile">
          <span className="stat-tile__icon stat-tile__icon--navy"><UsersIcon /></span>
          <div>
            <p className="stat-tile__value">{data.totals.avgUtilizationPercent == null ? '—' : data.totals.avgUtilizationPercent}
              {data.totals.avgUtilizationPercent != null && <span className="stat-tile__unit">%</span>}</p>
            <p className="stat-tile__label">Avg utilization, 08–20h</p>
          </div>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__icon stat-tile__icon--amber"><BoltIcon /></span>
          <div>
            <p className="stat-tile__value">{Math.round(data.totals.energyKwh || 0).toLocaleString()}<span className="stat-tile__unit">kWh</span></p>
            <p className="stat-tile__label">Energy recorded</p>
          </div>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__icon stat-tile__icon--rust"><AlertIcon /></span>
          <div>
            <p className="stat-tile__value">{data.totals.alerts}</p>
            <p className="stat-tile__label">Alerts raised</p>
          </div>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__icon stat-tile__icon--sage"><CheckIcon /></span>
          <div>
            <p className="stat-tile__value">{data.totals.readings.toLocaleString()}</p>
            <p className="stat-tile__label">Sensor readings analysed</p>
          </div>
        </div>
      </div>

      {empty ? (
        <p className="empty-state">
          No sensor readings in this period yet. Start the simulator (python3 simulate_sensors.py) and check back in a few minutes.
        </p>
      ) : (
        <>
          {insights.length > 0 && (
            <section className="insights">
              <h3 className="insights__title">What stands out</h3>
              <ul className="insights__list">
                {insights.map((text) => <li key={text}>{text}</li>)}
              </ul>
            </section>
          )}

          <div className="chart-grid">
            <ChartCard title="Utilization trend" subtitle="Average share of capacity in use between 08:00 and 20:00, per day">
              <LineChart data={dailyUtil} minTop={100} format={(v) => `${v}%`} ariaLabel="Average utilization per day" />
            </ChartCard>
            <ChartCard title="Energy per day" subtitle="Total kWh recorded by all sensors">
              <ColumnChart data={dailyEnergy} tone="amber" labelEvery={Math.max(1, Math.ceil(data.daily.length / 7))}
                           format={(v) => Math.round(v)} ariaLabel="Energy recorded per day" />
            </ChartCard>
            <ChartCard title="Peak hours" subtitle="Average fill by hour of the day (highlighted bar is the busiest)">
              <ColumnChart data={hourly} labelEvery={3} format={(v) => `${Math.round(v)}%`} ariaLabel="Average utilization by hour of day" />
            </ChartCard>
            <ChartCard title="Alerts by type" subtitle="Raised in this period">
              <ul className="hbar-list">
                {data.alerts.map((a) => (
                  <li key={a.type} className="hbar">
                    <span className="hbar__name">{ALERT_LABEL[a.type] || a.type}</span>
                    <span className="hbar__track"><span className="hbar__fill hbar__fill--navy" style={{ width: `${(a.count / alertMax) * 100}%` }} /></span>
                    <span className="hbar__value">{a.count}</span>
                  </li>
                ))}
              </ul>
            </ChartCard>
          </div>

          <ChartCard title="Space ranking" subtitle="Average utilization between 08:00 and 20:00 over the period, busiest first">
            <p className="chart-card__note">
              The bar is the average. "Busiest moment" is the single fullest reading, so a space can be quiet on average
              and still get crowded once.
            </p>
            <ul className="band-legend" aria-label="Legend">
              <li><span className="band-dot band-dot--low" /> Under-used (below 30%)</li>
              <li><span className="band-dot band-dot--ok" /> Well used</li>
              <li><span className="band-dot band-dot--high" /> Crowded (above 85%)</li>
            </ul>
            <ul className="hbar-list">
              {data.rooms.map((r) => {
                const b = band(r.avgUtilizationPercent);
                return (
                  <li key={r.resourceId} className="hbar hbar--room">
                    <span className="hbar__name">
                      <span className={`card-icon card-icon--${r.type} card-icon--tiny`}><TypeIcon type={r.type} /></span>
                      <span>
                        {r.name}
                        <small>{r.building}</small>
                      </span>
                    </span>
                    <span className="hbar__track">
                      <span className={`hbar__fill hbar__fill--${b.key}`}
                            style={{ width: `${Math.min(100, ((r.avgUtilizationPercent || 0) / roomMax) * 100)}%` }} />
                    </span>
                    <span className="hbar__value">
                      {pct(r.avgUtilizationPercent)}
                      <small>
                        {b.label}
                        {r.peakUtilizationPercent != null && (r.peakUtilizationPercent > 100
                          ? ` · went over capacity at peak (${r.peakUtilizationPercent}%)`
                          : ` · busiest moment ${r.peakUtilizationPercent}%`)}
                      </small>
                    </span>
                  </li>
                );
              })}
            </ul>
          </ChartCard>

          {showTables && (
            <section className="chart-card">
              <h3 className="chart-card__title">Data tables</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <caption>Daily</caption>
                  <thead><tr><th>Date</th><th>Avg fill</th><th>Energy (kWh)</th><th>Avg temp</th><th>Readings</th></tr></thead>
                  <tbody>
                    {data.daily.map((d) => (
                      <tr key={d.date}><td>{dayLabel(d.date)}</td><td>{pct(d.avgUtilizationPercent)}</td>
                        <td>{d.energyKwh ?? '—'}</td><td>{d.avgTemperature == null ? '—' : `${d.avgTemperature}°`}</td><td>{d.readings}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <caption>By hour of day</caption>
                  <thead><tr><th>Hour</th><th>Avg fill</th></tr></thead>
                  <tbody>
                    {data.hourly.map((h) => (
                      <tr key={h.hour}><td>{hourLabel(h.hour)}</td><td>{pct(h.avgUtilizationPercent)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <caption>By space</caption>
                  <thead><tr><th>Space</th><th>Building</th><th>Avg fill</th><th>Peak</th><th>Energy (kWh)</th></tr></thead>
                  <tbody>
                    {data.rooms.map((r) => (
                      <tr key={r.resourceId}><td>{r.name}</td><td>{r.building}</td><td>{pct(r.avgUtilizationPercent)}</td>
                        <td>{pct(r.peakUtilizationPercent)}</td><td>{r.energyKwh ?? '—'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
