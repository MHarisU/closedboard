const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

// --- Storage ---

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
    fs.writeFileSync(DATA_FILE, JSON.stringify(boardData, null, 2));
  } catch (e) {
    console.error('Failed to persist data:', e.message);
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
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(express.json());

// --- Routes ---

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), tasks: Object.keys(boardData.tasks).length });
});

app.get('/api/tasks', (_req, res) => {
  res.json(boardData);
});

app.post('/api/tasks', (req, res) => {
  const id = generateId();
  const task = {
    id,
    title: req.body.title || 'Untitled',
    description: req.body.description || '',
    column: req.body.column || 'backlog',
    priority: req.body.priority || 'medium',
    isAITask: req.body.isAITask || false,
    tags: req.body.tags || [],
    subtasks: req.body.subtasks || [],
    resources: req.body.resources || [],
    createdAt: Date.now(),
    completedAt: null
  };

  boardData.tasks[id] = task;
  addHistory('created', id, `Created: "${task.title}"`);
  saveData();
  res.json({ success: true, task });
});

app.put('/api/tasks/:id', (req, res) => {
  const task = boardData.tasks[req.params.id];
  if (!task) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const updates = req.body;
  // Prevent overwriting the id
  delete updates.id;
  Object.assign(task, updates);

  addHistory('updated', req.params.id, `Updated: "${task.title}"`);
  saveData();
  res.json({ success: true, task });
});

app.delete('/api/tasks/:id', (req, res) => {
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

app.post('/api/tasks/:id/move', (req, res) => {
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
});
