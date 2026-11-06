// Small helpers for showing and building dates the same way everywhere.

const dateFmt = { weekday: 'short', day: 'numeric', month: 'short' };
const timeFmt = { hour: 'numeric', minute: '2-digit' };

export function formatRange(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  const startText = `${start.toLocaleDateString([], dateFmt)}, ${start.toLocaleTimeString([], timeFmt)}`;
  const endText = sameDay
    ? end.toLocaleTimeString([], timeFmt)
    : `${end.toLocaleDateString([], dateFmt)}, ${end.toLocaleTimeString([], timeFmt)}`;
  return `${startText} – ${endText}`;
}

// "2026-10-26" for an <input type="date"> in the user's own time zone.
export function todayInputValue() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
