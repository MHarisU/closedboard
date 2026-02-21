const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'closedboard.db');

const API_SECRET = process.env.API_SECRET;
if (!API_SECRET) {
  console.warn('WARNING: API_SECRET not set. Defaulting to "53372". Set API_SECRET env var in production!');
}
const EFFECTIVE_SECRET = API_SECRET || '53372';

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['https://mharisu.github.io', 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

let db;

// --- Database helpers ---

function generateId() {
  return `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function saveDB() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const tmp = path.join(os.tmpdir(), `closedboard_${process.pid}_${Date.now()}.db`);
    fs.writeFileSync(tmp, buffer);
    fs.renameSync(tmp, DB_PATH);
  } catch (e) {
    console.error('Failed to save database:', e.message);
  }
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
}

function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    column: row.column_name,
    priority: row.priority,
    isAITask: Boolean(row.is_ai_task),
    tags: JSON.parse(row.tags || '[]'),
    subtasks: JSON.parse(row.subtasks || '[]'),
    resources: JSON.parse(row.resources || '[]'),
    createdAt: row.created_at,
    completedAt: row.completed_at
  };
}

function getAllTasks() {
  const tasks = {};
  for (const row of queryAll('SELECT * FROM tasks')) {
    const t = rowToTask(row);
    tasks[t.id] = t;
  }
  return tasks;
}

function getHistory() {
  return queryAll('SELECT * FROM history ORDER BY timestamp DESC LIMIT 50').map(r => ({
    id: r.id, action: r.action, taskId: r.task_id,
    timestamp: r.timestamp, message: r.message
  }));
}

function getBoardData() {
  return { tasks: getAllTasks(), history: getHistory(), meta: { lastUpdated: Date.now() } };
}

function addHistory(action, taskId, message) {
  db.run(
    'INSERT INTO history (id, action, task_id, timestamp, message) VALUES (?, ?, ?, ?, ?)',
    [generateId(), action, taskId, Date.now(), message]
  );
  db.run('DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY timestamp DESC LIMIT 50)');
}

function insertTask(task) {
  db.run(
    `INSERT INTO tasks (id, title, description, column_name, priority, is_ai_task,
     tags, subtasks, resources, created_at, completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [task.id, task.title, task.description, task.column, task.priority,
     task.isAITask ? 1 : 0, JSON.stringify(task.tags), JSON.stringify(task.subtasks),
     JSON.stringify(task.resources), task.createdAt, task.completedAt]
  );
}

function updateTaskRow(task) {
  db.run(
    `UPDATE tasks SET title=?, description=?, column_name=?, priority=?, is_ai_task=?,
     tags=?, subtasks=?, resources=?, created_at=?, completed_at=? WHERE id=?`,
    [task.title, task.description, task.column, task.priority,
     task.isAITask ? 1 : 0, JSON.stringify(task.tags || []),
     JSON.stringify(task.subtasks || []), JSON.stringify(task.resources || []),
     task.createdAt, task.completedAt, task.id]
  );
}

// --- SSE ---

const sseClients = new Set();

function broadcastEvent(eventType, data) {
  const msg = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(msg); } catch { sseClients.delete(client); }
  }
}

// --- Middleware ---

app.use(cors({
  origin: CORS_ORIGINS,
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
  if (pin === EFFECTIVE_SECRET) return res.json({ success: true });
  res.status(401).json({ success: false, error: 'Invalid PIN' });
});

// --- SSE Endpoint (auth via query param — EventSource can't send headers) ---

app.get('/api/events', (req, res) => {
  if (req.query.token !== EFFECTIVE_SECRET) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);
  sseClients.add(res);

  const heartbeat = setInterval(() => { res.write(': keepalive\n\n'); }, 30000);

  req.on('close', () => {
    sseClients.delete(res);
    clearInterval(heartbeat);
  });
});

// --- Protected Routes ---

app.get('/api/tasks', requireAuth, (_req, res) => {
  res.json(getBoardData());
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const id = generateId();
  const b = req.body;
  const task = {
    id, title: b.title || 'Untitled', description: b.description || '',
    column: b.column || 'backlog', priority: b.priority || 'medium',
    isAITask: b.isAITask || false, tags: b.tags || [],
    subtasks: b.subtasks || [], resources: b.resources || [],
    createdAt: Date.now(), completedAt: null
  };

  insertTask(task);
  addHistory('created', id, `Created: "${task.title}"`);
  saveDB();
  broadcastEvent('task_created', { task });
  res.json({ success: true, task });
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const row = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ success: false, error: 'Task not found' });

  const task = rowToTask(row);
  const { id: _ignore, ...updates } = req.body;
  Object.assign(task, updates);
  updateTaskRow(task);
  addHistory('updated', req.params.id, `Updated: "${task.title}"`);
  saveDB();
  broadcastEvent('task_updated', { task });
  res.json({ success: true, task });
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  const row = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ success: false, error: 'Task not found' });

  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  addHistory('deleted', req.params.id, `Deleted: "${row.title}"`);
  saveDB();
  broadcastEvent('task_deleted', { taskId: req.params.id });
  res.json({ success: true });
});

app.post('/api/tasks/:id/move', requireAuth, (req, res) => {
  const row = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ success: false, error: 'Task not found' });

  const { column } = req.body;
  if (!['backlog', 'inProgress', 'completed'].includes(column)) {
    return res.status(400).json({ success: false, error: 'Invalid column' });
  }

  const completedAt = column === 'completed' ? Date.now() : null;
  db.run('UPDATE tasks SET column_name = ?, completed_at = ? WHERE id = ?',
    [column, completedAt, req.params.id]);

  const task = rowToTask(queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]));
  const verb = column === 'completed' ? 'Completed' : 'Moved';
  addHistory(column === 'completed' ? 'completed' : 'moved', req.params.id, `${verb}: "${task.title}"`);
  saveDB();
  broadcastEvent('task_moved', { task });
  res.json({ success: true, task });
});

// --- Migration from legacy data.json ---

function migrateFromJSON() {
  const jsonPath = path.join(__dirname, 'data.json');
  if (!fs.existsSync(jsonPath)) return;
  try {
    const legacy = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    if (!legacy?.tasks || Object.keys(legacy.tasks).length === 0) return;
    if (queryAll('SELECT id FROM tasks').length > 0) return;

    for (const task of Object.values(legacy.tasks)) {
      insertTask({
        id: task.id, title: task.title || 'Untitled', description: task.description || '',
        column: task.column || 'backlog', priority: task.priority || 'medium',
        isAITask: task.isAITask || false, tags: task.tags || [],
        subtasks: task.subtasks || [], resources: task.resources || [],
        createdAt: task.createdAt || Date.now(), completedAt: task.completedAt || null
      });
    }
    if (legacy.history) {
      for (const e of legacy.history) {
        db.run('INSERT OR IGNORE INTO history (id,action,task_id,timestamp,message) VALUES (?,?,?,?,?)',
          [e.id, e.action, e.taskId, e.timestamp, e.message]);
      }
    }
    saveDB();
    fs.renameSync(jsonPath, jsonPath + '.migrated');
    console.log(`Migrated ${Object.keys(legacy.tasks).length} tasks from data.json`);
  } catch (e) {
    console.error('JSON migration failed:', e.message);
  }
}

// --- Graceful shutdown ---

process.on('SIGTERM', () => {
  if (db) { saveDB(); db.close(); }
  process.exit(0);
});

// --- Start ---

(async () => {
  const SQL = await initSqlJs();

  try {
    if (fs.existsSync(DB_PATH)) {
      db = new SQL.Database(fs.readFileSync(DB_PATH));
      console.log('Loaded existing database');
    } else {
      db = new SQL.Database();
      console.log('Created new database');
    }
  } catch (e) {
    console.error('DB load failed, creating fresh:', e.message);
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT 'Untitled',
    description TEXT DEFAULT '', column_name TEXT DEFAULT 'backlog',
    priority TEXT DEFAULT 'medium', is_ai_task INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]', subtasks TEXT DEFAULT '[]',
    resources TEXT DEFAULT '[]', created_at INTEGER NOT NULL,
    completed_at INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY, action TEXT NOT NULL, task_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL, message TEXT NOT NULL
  )`);

  migrateFromJSON();

  const taskCount = queryAll('SELECT id FROM tasks').length;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClosedBoard API running on port ${PORT}`);
    console.log(`Storage: SQLite via sql.js (${DB_PATH})`);
    console.log(`Tasks: ${taskCount} | SSE: enabled | Auth: ${API_SECRET ? 'set' : 'default'}`);
    console.log(`CORS: ${CORS_ORIGINS.join(', ')}`);
  });
})().catch(err => { console.error('Startup failed:', err); process.exit(1); });
