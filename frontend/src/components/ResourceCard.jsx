import React from 'react';
import { TypeIcon, UsersIcon, ThermoIcon, DropletIcon, BoltIcon } from '../icons';

const typeLabels = {
  CLASSROOM: 'Classroom',
  LAB: 'Laboratory',
  STUDY_SPACE: 'Study space',
  FACILITY: 'Facility',
};

const severityTone = {
  HIGH: 'critical',
  MEDIUM: 'warning',
  LOW: 'neutral',
};

const severityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };

const alertTypeLabel = {
  OVERCROWDING: 'Overcrowded',
  ENVIRONMENTAL: 'Environment alert',
  ENERGY_WASTE: 'Energy waste',
};

// The card's badge always mirrors the backend's own active-alerts list, so it
// never disagrees with the "Active alerts" panel above it. No reading means
// we just haven't heard from this resource's sensor yet.
function statusForAlerts(alerts, reading) {
  if (!reading) return { tone: 'neutral', label: 'No data yet' };

  if (alerts && alerts.length > 0) {
    const top = [...alerts].sort(
      (a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0)
    )[0];
    return {
      tone: severityTone[top.severity] || 'warning',
      label: alertTypeLabel[top.type] || top.type?.replace('_', ' ') || 'Alert',
    };
  }

  return { tone: 'good', label: 'Normal' };
}

export default function ResourceCard({ resource, reading, alerts = [] }) {
  const status = statusForAlerts(alerts, reading);

  return (
    <div className={`resource-card tone-${status.tone}`}>
      <div className="resource-card__header">
        <span className={`card-icon card-icon--${resource.type}`}>
          <TypeIcon type={resource.type} />
        </span>
        <div className="resource-card__heading">
          <h3 className="resource-card__name">{resource.name}</h3>
          <p className="resource-card__meta">
            {typeLabels[resource.type] || resource.type} · Floor {resource.floor}
          </p>
        </div>
        <span className={`status-pill status-pill--${status.tone}`}>{status.label}</span>
      </div>

      {reading ? (
        <div className="resource-card__stats">
          <div className="stat">
            <span className="stat__icon"><UsersIcon /></span>
            <span className="stat__body">
              <span className="stat__value">
                {reading.occupancyCount}
                <span className="stat__unit">/{resource.capacity ?? '—'}</span>
              </span>
              <span className="stat__label">Occupancy</span>
            </span>
          </div>
          <div className="stat">
            <span className="stat__icon"><ThermoIcon /></span>
            <span className="stat__body">
              <span className="stat__value">{reading.temperatureCelsius?.toFixed(1)}°</span>
              <span className="stat__label">Temperature</span>
            </span>
          </div>
          <div className="stat">
            <span className="stat__icon"><DropletIcon /></span>
            <span className="stat__body">
              <span className="stat__value">{reading.humidityPercent?.toFixed(0)}%</span>
              <span className="stat__label">Humidity</span>
            </span>
          </div>
          <div className="stat">
            <span className="stat__icon"><BoltIcon /></span>
            <span className="stat__body">
              <span className="stat__value">{reading.energyConsumptionKwh?.toFixed(2)}</span>
              <span className="stat__label">kWh</span>
            </span>
          </div>
        </div>
      ) : (
        <p className="resource-card__empty">Waiting for sensor data…</p>
      )}

      {reading && (
        <div className="resource-card__toggles">
          <span className={`toggle ${reading.acOn ? 'toggle--on' : ''}`}>AC {reading.acOn ? 'on' : 'off'}</span>
          <span className={`toggle ${reading.lightsOn ? 'toggle--on' : ''}`}>
            Lights {reading.lightsOn ? 'on' : 'off'}
          </span>
        </div>
      )}
    </div>
  );
}
