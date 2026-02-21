export const API_BASE = import.meta.env.VITE_API_URL || 'https://closedboard-api.onrender.com/api';

const AUTH_KEY = 'closedboard_auth';

export function getAuthToken() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const { token } = JSON.parse(raw);
    return token || null;
  } catch {
    return null;
  }
}

function authHeaders() {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function handleUnauthorized(res) {
  if (res.status === 401) {
    localStorage.removeItem(AUTH_KEY);
    window.location.reload();
    throw new Error('Session expired');
  }
}

export async function checkAPIHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET', mode: 'cors' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function authenticatePin(pin) {
  try {
    const res = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    return await res.json();
  } catch {
    return { success: false, error: 'Network error' };
  }
}

export async function fetchTasks() {
  try {
    const res = await fetch(`${API_BASE}/tasks`, { headers: authHeaders() });
    handleUnauthorized(res);
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    if (e.message === 'Session expired') throw e;
    console.warn('Fetch failed, using localStorage', e);
    return loadFromLocalStorage();
  }
}

export async function createTask(task) {
  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(task)
    });
    handleUnauthorized(res);
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    if (e.message === 'Session expired') throw e;
    return { success: false, offline: true, error: e.message };
  }
}

export async function updateTask(id, updates) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify(updates)
    });
    handleUnauthorized(res);
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    if (e.message === 'Session expired') throw e;
    return { success: false, offline: true, error: e.message };
  }
}

export async function deleteTask(id) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE', headers: authHeaders()
    });
    handleUnauthorized(res);
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    if (e.message === 'Session expired') throw e;
    return { success: false, offline: true, error: e.message };
  }
}

export async function moveTask(id, column) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}/move`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ column })
    });
    handleUnauthorized(res);
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    if (e.message === 'Session expired') throw e;
    return { success: false, offline: true, error: e.message };
  }
}

// ============ LocalStorage Fallback ============

const STORAGE_KEY = 'closedboard_data';

function loadFromLocalStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  return {
    tasks: {
      demo_1: {
        id: 'demo_1', title: 'API Connection Failed',
        description: 'Could not connect to ClosedBot API. Running in demo mode.',
        column: 'backlog', priority: 'high', createdAt: Date.now(), isAITask: false
      }
    },
    history: [], meta: { lastUpdated: Date.now() }
  };
}
