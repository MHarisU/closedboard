// API Configuration
// In production, this would be your server URL
// For local development, we use the workspace API
const API_BASE = import.meta.env.PROD 
  ? 'https://closedboard-api.openclaw.ai/api'  // Would need real domain
  : 'http://localhost:3847/api';

// For GitHub Pages demo, fall back to localStorage if API unavailable
let useLocalStorage = false;

// Check if API is available
export async function checkAPIHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { timeout: 3000 });
    if (res.ok) {
      useLocalStorage = false;
      return true;
    }
  } catch (e) {
    console.warn('API unavailable, using localStorage fallback');
  }
  useLocalStorage = true;
  return false;
}

// Fetch all tasks
export async function fetchTasks() {
  if (useLocalStorage) {
    return loadFromLocalStorage();
  }
  
  try {
    const res = await fetch(`${API_BASE}/tasks`);
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    console.warn('Fetch failed, using localStorage');
    return loadFromLocalStorage();
  }
}

// Create task
export async function createTask(task) {
  if (useLocalStorage) {
    return createTaskLocal(task);
  }
  
  try {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    return createTaskLocal(task);
  }
}

// Update task
export async function updateTask(id, updates) {
  if (useLocalStorage) {
    return updateTaskLocal(id, updates);
  }
  
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    return updateTaskLocal(id, updates);
  }
}

// Delete task
export async function deleteTask(id) {
  if (useLocalStorage) {
    return deleteTaskLocal(id);
  }
  
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    return deleteTaskLocal(id);
  }
}

// Move task
export async function moveTask(id, column) {
  if (useLocalStorage) {
    return moveTaskLocal(id, column);
  }
  
  try {
    const res = await fetch(`${API_BASE}/tasks/${id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column })
    });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (e) {
    return moveTaskLocal(id, column);
  }
}

// ============ LocalStorage Fallback ============

const STORAGE_KEY = 'closedboard_data';

function loadFromLocalStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return getDefaultData();
}

function saveToLocalStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function generateId() {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function addHistoryLocal(data, action, taskId, message) {
  data.history = [{
    id: `h_${Date.now()}`,
    action,
    taskId,
    timestamp: Date.now(),
    message
  }, ...data.history].slice(0, 100);
}

function createTaskLocal(task) {
  const data = loadFromLocalStorage();
  const id = generateId();
  const newTask = {
    id,
    ...task,
    createdAt: Date.now()
  };
  data.tasks[id] = newTask;
  addHistoryLocal(data, 'created', id, `Created: "${task.title}"`);
  saveToLocalStorage(data);
  return { success: true, task: newTask };
}

function updateTaskLocal(id, updates) {
  const data = loadFromLocalStorage();
  if (!data.tasks[id]) return { error: 'Not found' };
  data.tasks[id] = { ...data.tasks[id], ...updates };
  addHistoryLocal(data, 'updated', id, `Updated: "${data.tasks[id].title}"`);
  saveToLocalStorage(data);
  return { success: true, task: data.tasks[id] };
}

function deleteTaskLocal(id) {
  const data = loadFromLocalStorage();
  if (!data.tasks[id]) return { error: 'Not found' };
  const title = data.tasks[id].title;
  delete data.tasks[id];
  addHistoryLocal(data, 'deleted', id, `Deleted: "${title}"`);
  saveToLocalStorage(data);
  return { success: true };
}

function moveTaskLocal(id, column) {
  const data = loadFromLocalStorage();
  if (!data.tasks[id]) return { error: 'Not found' };
  const task = data.tasks[id];
  task.column = column;
  if (column === 'completed') task.completedAt = Date.now();
  const actionMap = { backlog: 'moved to backlog', inProgress: 'started', completed: 'completed' };
  addHistoryLocal(data, column === 'completed' ? 'completed' : 'moved', id, `${actionMap[column]}: "${task.title}"`);
  saveToLocalStorage(data);
  return { success: true, task };
}

function getDefaultData() {
  return {
    tasks: {
      demo_1: {
        id: 'demo_1',
        title: 'Welcome to ClosedBoard!',
        description: 'This is running in demo mode. Connect to the API for full sync.',
        column: 'backlog',
        priority: 'medium',
        createdAt: Date.now(),
        isAITask: false
      }
    },
    history: [],
    meta: { lastUpdated: Date.now() }
  };
}
