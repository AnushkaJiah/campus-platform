import axios from 'axios';
import { loadSession, clearSession, SESSION_EXPIRED_EVENT } from './auth';

const BASE_URL = 'http://localhost:8080/api';

const http = axios.create({ baseURL: BASE_URL });

// Attach the login token to every request.
http.interceptors.request.use((config) => {
  const session = loadSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

// If the server says the token is no longer valid (expired, tampered), send the user back to login.
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginCall = error.config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !isLoginCall) {
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

export const api = {
  login: (email, password) => http.post('/auth/login', { email, password }).then((r) => r.data),
  register: (name, email, password) =>
    http.post('/auth/register', { name, email, password }).then((r) => r.data),

  getResources: () => http.get('/resources').then((r) => r.data),
  getLatestReading: (resourceId) =>
    http
      .get(`/sensor-readings/resource/${resourceId}/latest`)
      .then((r) => r.data)
      .catch(() => null), // no reading yet for this resource
  getActiveAlerts: () => http.get('/alerts').then((r) => r.data),
  resolveAlert: (alertId) => http.put(`/alerts/${alertId}/resolve`),

  // Bookings
  createBooking: (booking) => http.post('/bookings', booking).then((r) => r.data),
  getMyBookings: () => http.get('/bookings/mine').then((r) => r.data),
  getAllBookings: () => http.get('/bookings').then((r) => r.data),
  getResourceSlots: (resourceId) => http.get(`/bookings/resource/${resourceId}`).then((r) => r.data),
  approveBooking: (id, note) => http.put(`/bookings/${id}/approve`, { note }).then((r) => r.data),
  rejectBooking: (id, note) => http.put(`/bookings/${id}/reject`, { note }).then((r) => r.data),
  cancelBooking: (id) => http.put(`/bookings/${id}/cancel`).then((r) => r.data),
};
