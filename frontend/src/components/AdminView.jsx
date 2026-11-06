import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api';
import ResourceCard from './ResourceCard';
import AlertsPanel from './AlertsPanel';
import { BuildingIcon, CheckIcon, AlertIcon, BoltIcon } from '../icons';

const POLL_INTERVAL_MS = 5000;

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

export default function AdminView() {
  const [resources, setResources] = useState([]);
  const [readings, setReadings] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [connectionOk, setConnectionOk] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const resourceList = await api.getResources();
      setResources(resourceList);

      const readingEntries = await Promise.all(
        resourceList.map(async (resource) => [resource.id, await api.getLatestReading(resource.id)])
      );
      setReadings(Object.fromEntries(readingEntries));

      const activeAlerts = await api.getActiveAlerts();
      setAlerts(activeAlerts);

      setConnectionOk(true);
      setLastUpdated(new Date());
    } catch (err) {
      setConnectionOk(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleResolve = async (alertId) => {
    await api.resolveAlert(alertId);
    refresh();
  };

  const buildingGroups = useMemo(() => groupByBuilding(resources), [resources]);

  const alertsByResource = useMemo(() => {
    const map = new Map();
    alerts.forEach((alert) => {
      const id = alert.resource?.id;
      if (id == null) return;
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(alert);
    });
    return map;
  }, [alerts]);

  const stats = useMemo(() => {
    const total = resources.length;
    const available = resources.filter((r) => r.status === 'AVAILABLE').length;
    const totalEnergy = Object.values(readings).reduce(
      (sum, r) => sum + (r?.energyConsumptionKwh || 0),
      0
    );
    return {
      total,
      available,
      buildings: buildingGroups.length,
      alerts: alerts.length,
      energy: totalEnergy,
    };
  }, [resources, alerts, buildingGroups, readings]);

  return (
    <>
      <div className="toolbar-row">
        <div className={`connection-indicator ${connectionOk ? 'connection-indicator--ok' : 'connection-indicator--down'}`}>
          <span className="connection-indicator__dot" />
          {connectionOk
            ? `Live · updated ${lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}`
            : 'Backend unreachable'}
        </div>
      </div>

      <div className="stats-strip">
        <div className="stat-tile">
          <span className="stat-tile__icon stat-tile__icon--navy"><BuildingIcon /></span>
          <div>
            <p className="stat-tile__value">{stats.total}</p>
            <p className="stat-tile__label">Total spaces</p>
          </div>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__icon stat-tile__icon--sage"><CheckIcon /></span>
          <div>
            <p className="stat-tile__value">{stats.available}</p>
            <p className="stat-tile__label">Available now</p>
          </div>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__icon stat-tile__icon--rust"><AlertIcon /></span>
          <div>
            <p className="stat-tile__value">{stats.alerts}</p>
            <p className="stat-tile__label">Active alerts</p>
          </div>
        </div>
        <div className="stat-tile">
          <span className="stat-tile__icon stat-tile__icon--amber"><BoltIcon /></span>
          <div>
            <p className="stat-tile__value">{stats.energy.toFixed(1)}<span className="stat-tile__unit">kWh</span></p>
            <p className="stat-tile__label">Live draw</p>
          </div>
        </div>
      </div>

      <AlertsPanel alerts={alerts} onResolve={handleResolve} />

      <section>
        <div className="section-head">
          <h2 className="section-title">Campus overview</h2>
          <span className="section-count">{resources.length} space{resources.length === 1 ? '' : 's'} across {buildingGroups.length} building{buildingGroups.length === 1 ? '' : 's'}</span>
        </div>

        {resources.length === 0 ? (
          <p className="empty-state">
            No resources yet. Create one via the backend API to see it appear here.
          </p>
        ) : (
          buildingGroups.map(({ building, resources: buildingResources }) => (
            <div className="building-section" key={building?.id ?? 'unassigned'}>
              <div className="building-section__header">
                <h3 className="building-section__name">{building?.name || 'Unassigned'}</h3>
                <p className="building-section__meta">
                  {building?.code}{building?.location ? ` · ${building.location}` : ''}{building?.totalFloors ? ` · ${building.totalFloors} floors` : ''}
                </p>
              </div>
              <div className="resource-grid">
                {buildingResources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    reading={readings[resource.id]}
                    alerts={alertsByResource.get(resource.id) || []}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}
