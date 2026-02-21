const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

const API_SECRET = process.env.API_SECRET;
if (!API_SECRET) {
  console.warn('WARNING: API_SECRET not set. Defaulting to "53372". Set API_SECRET env var in production!');
}
const EFFECTIVE_SECRET = API_SECRET || '53372';

// --- Storage (atomic JSON writes) ---

function generateId() {
  return `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.tasks) return parsed;
    }
  } catch (e) {
    console.error('Failed to load data file:', e.message);
  }
  return { tasks: {}, history: [], meta: { lastUpdated: Date.now() } };
}

function saveData() {
  try {
    const tmp = path.join(os.tmpdir(), `closedboard_${process.pid}_${Date.now()}.json`);
    fs.writeFileSync(tmp, JSON.stringify(boardData, null, 2));
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) {
    console.error('Failed to persist data:', e.message);
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(boardData, null, 2));
    } catch (e2) {
      console.error('Fallback write also failed:', e2.message);
    }
  }
}

let boardData = loadData();

function addHistory(action, taskId, message) {
  boardData.history.unshift({
    id: generateId(),
    action,
    taskId,
    timestamp: Date.now(),
    message
  });
  boardData.history = boardData.history.slice(0, 50);
  boardData.meta.lastUpdated = Date.now();
}

// --- Middleware ---

app.use(cors({
  origin: [
    'https://mharisu.github.io',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (header.slice(7) !== EFFECTIVE_SECRET) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  next();
}

// --- Public Routes ---

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.post('/api/auth', (req, res) => {
  const { pin } = req.body || {};
  if (pin === EFFECTIVE_SECRET) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, error: 'Invalid PIN' });
});

// --- Protected Routes ---

app.get('/api/tasks', requireAuth, (_req, res) => {
  res.json(boardData);
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const id = generateId();
  const body = req.body;
  const task = {
    id,
    title: body.title || 'Untitled',
    description: body.description || '',
    column: body.column || 'backlog',
    priority: body.priority || 'medium',
    isAITask: body.isAITask || false,
    tags: body.tags || [],
    subtasks: body.subtasks || [],
    resources: body.resources || [],
    createdAt: Date.now(),
    completedAt: null
  };

  boardData.tasks[id] = task;
  addHistory('created', id, `Created: "${task.title}"`);
  saveData();
  res.json({ success: true, task });
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const task = boardData.tasks[req.params.id];
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const { id: _ignoreId, ...updates } = req.body;
  Object.assign(task, updates);

  addHistory('updated', req.params.id, `Updated: "${task.title}"`);
  saveData();
  res.json({ success: true, task });
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  const task = boardData.tasks[req.params.id];
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const title = task.title;
  delete boardData.tasks[req.params.id];
  addHistory('deleted', req.params.id, `Deleted: "${title}"`);
  saveData();
  res.json({ success: true });
});

app.post('/api/tasks/:id/move', requireAuth, (req, res) => {
  const task = boardData.tasks[req.params.id];
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const { column } = req.body;
  if (!['backlog', 'inProgress', 'completed'].includes(column)) {
    return res.status(400).json({ success: false, error: 'Invalid column' });
  }

  task.column = column;
  task.completedAt = column === 'completed' ? Date.now() : null;

  const action = column === 'completed' ? 'completed' : 'moved';
  const verb = column === 'completed' ? 'Completed' : 'Moved';
  addHistory(action, req.params.id, `${verb}: "${task.title}"`);
  saveData();
  res.json({ success: true, task });
});

// --- Start ---

app.listen(PORT, '0.0.0.0', () => {
  console.log(`ClosedBoard API running on port ${PORT}`);
  console.log(`Tasks loaded: ${Object.keys(boardData.tasks).length}`);
  console.log(`Auth: ${API_SECRET ? 'API_SECRET set' : 'using default (set API_SECRET!)'}`);
});
