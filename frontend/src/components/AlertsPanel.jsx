import React from 'react';

const severityTone = {
  HIGH: 'critical',
  MEDIUM: 'warning',
  LOW: 'neutral',
};

export default function AlertsPanel({ alerts, onResolve }) {
  if (alerts.length === 0) {
    return (
      <section className="alerts-panel">
        <h2 className="section-title">Active alerts</h2>
        <p className="alerts-panel__empty">No active alerts. Everything is operating normally.</p>
      </section>
    );
  }

  return (
    <section className="alerts-panel">
      <h2 className="section-title">Active alerts ({alerts.length})</h2>
      <ul className="alerts-panel__list">
        {alerts.map((alert) => (
          <li key={alert.id} className={`alert-row tone-${severityTone[alert.severity] || 'neutral'}`}>
            <div className="alert-row__body">
              <span className={`status-pill status-pill--${severityTone[alert.severity]}`}>
                {alert.severity}
              </span>
              <p className="alert-row__message">{alert.message}</p>
            </div>
            <button className="alert-row__resolve" onClick={() => onResolve(alert.id)}>
              Resolve
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
