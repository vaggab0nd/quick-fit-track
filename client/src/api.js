const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  register: (name, pin) => request('POST', '/auth/register', { name, pin }),
  login: (name, pin) => request('POST', '/auth/login', { name, pin }),
  me: () => request('GET', '/auth/me'),

  // Activities
  getActivities: () => request('GET', '/activities'),
  addActivity: (data) => request('POST', '/activities', data),
  deleteActivity: (id) => request('DELETE', `/activities/${id}`),

  // Leaderboard
  getLeaderboard: () => request('GET', '/leaderboard'),

  // Strava
  stravaSync: () => request('POST', '/strava/sync'),
  stravaDisconnect: () => request('DELETE', '/strava/disconnect'),
};
