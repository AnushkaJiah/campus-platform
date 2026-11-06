// Keeps the logged-in user (and their token) in the browser so a refresh doesn't log you out.
const KEY = 'campus.session';

export function loadSession() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function saveSession(session) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch (err) {
    // storage blocked: the user simply has to log in again after a refresh
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(KEY);
  } catch (err) {
    // nothing to clear
  }
}

export const SESSION_EXPIRED_EVENT = 'campus:session-expired';
