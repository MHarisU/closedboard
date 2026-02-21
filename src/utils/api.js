export const API_BASE = import.meta.env.VITE_API_URL || 'https://closedboard-api.onrender.com/api';

const AUTH_KEY = 'closedboard_auth';

export function getAuthToken() {
  try { const raw = localStorage.getItem(AUTH_KEY); if (!raw) return null; return JSON.parse(raw).token || null; }
  catch { return null; }
}

function authHeaders() {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function handleUnauthorized(res) {
  if (res.status === 401) { localStorage.removeItem(AUTH_KEY); window.location.reload(); throw new Error('Session expired'); }
}

export async function checkAPIHealth() {
  try { const res = await fetch(`${API_BASE}/health`, { method: 'GET', mode: 'cors' }); return res.ok; }
  catch { return false; }
}

export async function authenticatePin(pin) {
  try {
    const res = await fetch(`${API_BASE}/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
    return await res.json();
  } catch { return { success: false, error: 'Network error' }; }
}

// ---------- Tasks ----------

export async function fetchTasks(boardId = 'default') {
  try {
    const res = await fetch(`${API_BASE}/tasks?boardId=${encodeURIComponent(boardId)}`, { headers: authHeaders() });
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
    const res = await fetch(`${API_BASE}/tasks`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(task) });
    handleUnauthorized(res); if (!res.ok) throw new Error('API error'); return await res.json();
  } catch (e) { if (e.message === 'Session expired') throw e; return { success: false, offline: true, error: e.message }; }
}

export async function updateTask(id, updates) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(updates) });
    handleUnauthorized(res); if (!res.ok) throw new Error('API error'); return await res.json();
  } catch (e) { if (e.message === 'Session expired') throw e; return { success: false, offline: true, error: e.message }; }
}

export async function deleteTask(id) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE', headers: authHeaders() });
    handleUnauthorized(res); if (!res.ok) throw new Error('API error'); return await res.json();
  } catch (e) { if (e.message === 'Session expired') throw e; return { success: false, offline: true, error: e.message }; }
}

export async function moveTask(id, column) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}/move`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ column }) });
    handleUnauthorized(res); if (!res.ok) throw new Error('API error'); return await res.json();
  } catch (e) { if (e.message === 'Session expired') throw e; return { success: false, offline: true, error: e.message }; }
}

// ---------- Timer ----------

export async function startTimer(taskId) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/timer/start`, { method: 'POST', headers: authHeaders() });
    handleUnauthorized(res); if (!res.ok) { const d = await res.json(); return { success: false, error: d.error }; }
    return await res.json();
  } catch (e) { if (e.message === 'Session expired') throw e; return { success: false, offline: true, error: e.message }; }
}

export async function stopTimer(taskId) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${taskId}/timer/stop`, { method: 'POST', headers: authHeaders() });
    handleUnauthorized(res); if (!res.ok) { const d = await res.json(); return { success: false, error: d.error }; }
    return await res.json();
  } catch (e) { if (e.message === 'Session expired') throw e; return { success: false, offline: true, error: e.message }; }
}

// ---------- Boards ----------

export async function fetchBoards() {
  try {
    const res = await fetch(`${API_BASE}/boards`, { headers: authHeaders() });
    handleUnauthorized(res); if (!res.ok) throw new Error('API error'); return await res.json();
  } catch (e) { if (e.message === 'Session expired') throw e; return { boards: [{ id: 'default', name: 'My Board', color: 'blue' }] }; }
}

export async function createBoard(board) {
  try {
    const res = await fetch(`${API_BASE}/boards`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(board) });
    handleUnauthorized(res); if (!res.ok) throw new Error('API error'); return await res.json();
  } catch (e) { if (e.message === 'Session expired') throw e; return { success: false, error: e.message }; }
}

export async function updateBoard(id, updates) {
  try {
    const res = await fetch(`${API_BASE}/boards/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(updates) });
    handleUnauthorized(res); if (!res.ok) throw new Error('API error'); return await res.json();
  } catch (e) { if (e.message === 'Session expired') throw e; return { success: false, error: e.message }; }
}

export async function deleteBoard(id) {
  try {
    const res = await fetch(`${API_BASE}/boards/${id}`, { method: 'DELETE', headers: authHeaders() });
    handleUnauthorized(res); const d = await res.json(); return d;
  } catch (e) { if (e.message === 'Session expired') throw e; return { success: false, error: e.message }; }
}

// ---------- Custom Tags ----------

export async function fetchCustomTags() {
  try {
    const res = await fetch(`${API_BASE}/tags`, { headers: authHeaders() });
    handleUnauthorized(res); if (!res.ok) throw new Error('API error'); return await res.json();
  } catch (e) { if (e.message === 'Session expired') throw e; return { tags: {} }; }
}

export async function createCustomTag(tag) {
  try {
    const res = await fetch(`${API_BASE}/tags`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(tag) });
    handleUnauthorized(res); if (!res.ok) { const d = await res.json(); return { success: false, error: d.error }; }
    return await res.json();
  } catch (e) { if (e.message === 'Session expired') throw e; return { success: false, error: e.message }; }
}

export async function updateCustomTag(id, updates) {
  try {
    const res = await fetch(`${API_BASE}/tags/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(updates) });
    handleUnauthorized(res); if (!res.ok) throw new Error('API error'); return await res.json();
  } catch (e) { if (e.message === 'Session expired') throw e; return { success: false, error: e.message }; }
}

export async function deleteCustomTag(id) {
  try {
    const res = await fetch(`${API_BASE}/tags/${id}`, { method: 'DELETE', headers: authHeaders() });
    handleUnauthorized(res); if (!res.ok) throw new Error('API error'); return await res.json();
  } catch (e) { if (e.message === 'Session expired') throw e; return { success: false, error: e.message }; }
}

// ---------- Insights ----------

export async function fetchInsights(boardId = 'default') {
  try {
    const res = await fetch(`${API_BASE}/insights?boardId=${encodeURIComponent(boardId)}`, { headers: authHeaders() });
    handleUnauthorized(res); if (!res.ok) throw new Error('API error'); return await res.json();
  } catch (e) { if (e.message === 'Session expired') throw e; return { insights: [] }; }
}

// ---------- Export ----------

export function getExportUrl(boardId, format = 'json') {
  const token = getAuthToken();
  const params = new URLSearchParams({ format });
  if (boardId) params.set('boardId', boardId);
  return `${API_BASE}/export?${params}`;
}

export async function downloadExport(boardId, format = 'json') {
  try {
    const res = await fetch(getExportUrl(boardId, format), { headers: authHeaders() });
    handleUnauthorized(res);
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const ext = format === 'csv' ? 'csv' : 'json';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `closedboard-export.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
}

// ---------- LocalStorage Fallback ----------

const STORAGE_KEY = 'closedboard_data';
function loadFromLocalStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  return {
    tasks: { demo_1: { id: 'demo_1', title: 'API Connection Failed', description: 'Could not connect to ClosedBot API. Running in demo mode.',
      column: 'backlog', priority: 'high', createdAt: Date.now(), isAITask: false } },
    history: [], meta: { lastUpdated: Date.now() }
  };
}
