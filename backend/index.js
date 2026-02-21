const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'closedboard.db');

const API_SECRET = process.env.API_SECRET;
if (!API_SECRET) {
  console.warn('WARNING: API_SECRET not set. Defaulting to "53372". Set API_SECRET env var in production!');
}
const EFFECTIVE_SECRET = API_SECRET || '53372';

// --- Database ---

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

const stmt = {
  getAllTasks: db.prepare('SELECT data FROM tasks'),
  getTask: db.prepare('SELECT data FROM tasks WHERE id = ?'),
  upsertTask: db.prepare('INSERT OR REPLACE INTO tasks (id, data) VALUES (?, ?)'),
  deleteTask: db.prepare('DELETE FROM tasks WHERE id = ?'),
  getHistory: db.prepare('SELECT data FROM history ORDER BY created_at DESC LIMIT 50'),
  insertHistory: db.prepare('INSERT INTO history (id, data, created_at) VALUES (?, ?, ?)'),
  trimHistory: db.prepare(`DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY created_at DESC LIMIT 50)`),
  upsertMeta: db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)'),
  getMeta: db.prepare('SELECT value FROM meta WHERE key = ?'),
};

// Migrate from legacy data.json if it exists
(function migrateFromJSON() {
  const jsonPath = path.join(__dirname, 'data.json');
  if (!fs.existsSync(jsonPath)) return;
  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const legacy = JSON.parse(raw);
    if (!legacy?.tasks || Object.keys(legacy.tasks).length === 0) return;

    const taskCount = stmt.getAllTasks.all().length;
    if (taskCount > 0) return;

    const migrate = db.transaction(() => {
      for (const [id, task] of Object.entries(legacy.tasks)) {
        stmt.upsertTask.run(id, JSON.stringify(task));
      }
      if (legacy.history) {
        for (const entry of legacy.history) {
          stmt.insertHistory.run(entry.id, JSON.stringify(entry), entry.timestamp || Date.now());
        }
      }
    });
    migrate();
    fs.renameSync(jsonPath, jsonPath + '.migrated');
    console.log(`Migrated ${Object.keys(legacy.tasks).length} tasks from data.json`);
  } catch (e) {
    console.error('JSON migration failed:', e.message);
  }
})();

// --- Helpers ---

function generateId() {
  return `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function getAllTasks() {
  const tasks = {};
  for (const row of stmt.getAllTasks.all()) {
    const task = JSON.parse(row.data);
    tasks[task.id] = task;
  }
  return tasks;
}

function getBoardData() {
  return {
    tasks: getAllTasks(),
    history: stmt.getHistory.all().map(r => JSON.parse(r.data)),
    meta: { lastUpdated: Number(stmt.getMeta.get('lastUpdated')?.value || Date.now()) }
  };
}

function addHistory(action, taskId, message) {
  const id = generateId();
  const entry = { id, action, taskId, timestamp: Date.now(), message };
  stmt.insertHistory.run(id, JSON.stringify(entry), Date.now());
  stmt.trimHistory.run();
  stmt.upsertMeta.run('lastUpdated', String(Date.now()));
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
  res.json(getBoardData());
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

  stmt.upsertTask.run(id, JSON.stringify(task));
  addHistory('created', id, `Created: "${task.title}"`);
  res.json({ success: true, task });
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const row = stmt.getTask.get(req.params.id);
  if (!row) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const existing = JSON.parse(row.data);
  const { id: _ignoreId, ...updates } = req.body;
  const updated = { ...existing, ...updates };

  stmt.upsertTask.run(req.params.id, JSON.stringify(updated));
  addHistory('updated', req.params.id, `Updated: "${updated.title}"`);
  res.json({ success: true, task: updated });
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  const row = stmt.getTask.get(req.params.id);
  if (!row) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const task = JSON.parse(row.data);
  stmt.deleteTask.run(req.params.id);
  addHistory('deleted', req.params.id, `Deleted: "${task.title}"`);
  res.json({ success: true });
});

app.post('/api/tasks/:id/move', requireAuth, (req, res) => {
  const row = stmt.getTask.get(req.params.id);
  if (!row) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }

  const { column } = req.body;
  if (!['backlog', 'inProgress', 'completed'].includes(column)) {
    return res.status(400).json({ success: false, error: 'Invalid column' });
  }

  const task = JSON.parse(row.data);
  task.column = column;
  task.completedAt = column === 'completed' ? Date.now() : null;

  stmt.upsertTask.run(req.params.id, JSON.stringify(task));
  const action = column === 'completed' ? 'completed' : 'moved';
  const verb = column === 'completed' ? 'Completed' : 'Moved';
  addHistory(action, req.params.id, `${verb}: "${task.title}"`);
  res.json({ success: true, task });
});

// --- Graceful shutdown ---

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});

// --- Start ---

app.listen(PORT, '0.0.0.0', () => {
  const taskCount = stmt.getAllTasks.all().length;
  console.log(`ClosedBoard API running on port ${PORT}`);
  console.log(`Storage: SQLite (${DB_PATH})`);
  console.log(`Tasks loaded: ${taskCount}`);
  console.log(`Auth: ${API_SECRET ? 'API_SECRET set' : 'using default (set API_SECRET!)'}`);
});
