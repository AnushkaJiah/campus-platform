import React, { useEffect, useState } from 'react';
import { api } from '../api';

const PRIORITIES = [
  { key: 'LOW', label: 'Low' },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'HIGH', label: 'Urgent' },
];

export default function ReportModal({ onClose, onCreated }) {
  const [resources, setResources] = useState([]);
  const [resourceId, setResourceId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getResources()
      .then((list) => {
        if (cancelled) return;
        const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
        setResources(sorted);
      })
      .catch(() => !cancelled && setError('Could not load the list of rooms. Is the backend running?'));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!resourceId) {
      setError('Please choose the room with the problem.');
      return;
    }
    if (!title.trim()) {
      setError('Please give the problem a short title.');
      return;
    }
    setBusy(true);
    try {
      const report = await api.createMaintenance({
        resourceId: Number(resourceId),
        title: title.trim(),
        description: description.trim(),
        priority,
      });
      onCreated(report);
    } catch (err) {
      if (!err.response) setError('Cannot reach the server. Is the backend running?');
      else setError(err.response.data?.message || 'Could not send the report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label="Report a problem">
        <div className="modal__header">
          <div>
            <h2 className="modal__title">Report a problem</h2>
            <p className="modal__subtitle">Tell the facilities team what needs fixing.</p>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <label className="field">
          <span className="field__label">Room</span>
          <select className="field__input" value={resourceId} onChange={(e) => setResourceId(e.target.value)} required>
            <option value="">Choose a room…</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}{r.building?.name ? ` — ${r.building.name}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">What is wrong?</span>
          <input className="field__input" type="text" value={title} maxLength={120}
                 placeholder="e.g. Projector will not turn on"
                 onChange={(e) => setTitle(e.target.value)} required />
        </label>

        <label className="field">
          <span className="field__label">More detail (optional)</span>
          <textarea className="field__input field__input--area" rows={3} value={description} maxLength={1000}
                    placeholder="When did it start? Anything we should know?"
                    onChange={(e) => setDescription(e.target.value)} />
        </label>

        <div className="field">
          <span className="field__label">How urgent is it?</span>
          <div className="filter-tabs">
            {PRIORITIES.map((p) => (
              <button type="button" key={p.key}
                      className={`filter-tab ${priority === p.key ? 'filter-tab--active' : ''}`}
                      onClick={() => setPriority(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="login-card__error" role="alert">{error}</p>}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Sending…' : 'Send report'}
          </button>
        </div>
      </form>
    </div>
  );
}
