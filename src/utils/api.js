// API Configuration
const API_BASE = 'https://legends-athletics-task-disturbed.trycloudflare.com/api';

// Check if API is available
export async function checkAPIHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { 
      method: 'GET',
      mode: 'cors'
    });
    if (res.ok) {
      return true;
    }
  } catch (e) {
    console.warn('API unavailable, using localStorage fallback', e);
  }
  return false;
}

// Fetch all tasks
export async function fetchTasks() {
  try {
    const res = await fetch(`${API_BASE}/tasks`);
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    console.warn('Fetch failed, using localStorage', e);
    return loadFromLocalStorage();
  }
}

// Create task
export async function createTask(task) {
  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    console.error('Create failed', e);
    return { error: e.message };
  }
}

// Update task
export async function updateTask(id, updates) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    console.error('Update failed', e);
    return { error: e.message };
  }
}

// Delete task
export async function deleteTask(id) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    console.error('Delete failed', e);
    return { error: e.message };
  }
}

// Move task
export async function moveTask(id, column) {
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column })
    });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    console.error('Move failed', e);
    return { error: e.message };
  }
}

// ============ LocalStorage Fallback ============

const STORAGE_KEY = 'closedboard_data';

function loadFromLocalStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    tasks: {
      demo_1: {
        id: 'demo_1',
        title: 'API Connection Failed',
        description: 'Could not connect to ClosedBot API. Running in demo mode.',
        column: 'backlog',
        priority: 'high',
        createdAt: Date.now(),
        isAITask: false
      }
    },
    history: [],
    meta: { lastUpdated: Date.now() }
  };
}
