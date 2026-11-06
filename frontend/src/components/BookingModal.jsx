import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { formatRange, todayInputValue } from '../datetime';

export default function BookingModal({ resource, onClose, onBooked }) {
  const [date, setDate] = useState(todayInputValue());
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [purpose, setPurpose] = useState('');
  const [slots, setSlots] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .getResourceSlots(resource.id)
      .then((data) => !cancelled && setSlots(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [resource.id]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    if (!(end > start)) {
      setError('The end time must be after the start time.');
      return;
    }
    if (start < new Date()) {
      setError('That start time has already passed.');
      return;
    }

    setBusy(true);
    try {
      const booking = await api.createBooking({
        resourceId: resource.id,
        startTime: `${date}T${startTime}`,
        endTime: `${date}T${endTime}`,
        purpose,
      });
      onBooked(booking);
    } catch (err) {
      if (!err.response) setError('Cannot reach the server. Is the backend running?');
      else setError(err.response.data?.message || 'Could not create the booking.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label={`Book ${resource.name}`}>
        <div className="modal__header">
          <div>
            <h2 className="modal__title">Book {resource.name}</h2>
            <p className="modal__subtitle">
              {resource.building?.name} · Floor {resource.floor}
              {resource.capacity ? ` · Seats up to ${resource.capacity}` : ''}
            </p>
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <label className="field">
          <span className="field__label">Date</span>
          <input className="field__input" type="date" value={date} min={todayInputValue()}
                 onChange={(e) => setDate(e.target.value)} required />
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field__label">From</span>
            <input className="field__input" type="time" value={startTime}
                   onChange={(e) => setStartTime(e.target.value)} required />
          </label>
          <label className="field">
            <span className="field__label">To</span>
            <input className="field__input" type="time" value={endTime}
                   onChange={(e) => setEndTime(e.target.value)} required />
          </label>
        </div>

        <label className="field">
          <span className="field__label">What is it for? (optional)</span>
          <input className="field__input" type="text" value={purpose} maxLength={120}
                 placeholder="e.g. Group project meeting"
                 onChange={(e) => setPurpose(e.target.value)} />
        </label>

        {slots.length > 0 && (
          <div className="slots">
            <p className="slots__title">Already booked</p>
            <ul className="slots__list">
              {slots.slice(0, 5).map((slot, i) => (
                <li key={i}>{formatRange(slot.startTime, slot.endTime)}</li>
              ))}
            </ul>
            {slots.length > 5 && <p className="slots__more">and {slots.length - 5} more</p>}
          </div>
        )}

        {error && <p className="login-card__error" role="alert">{error}</p>}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Sending…' : 'Request booking'}
          </button>
        </div>
      </form>
    </div>
  );
}
