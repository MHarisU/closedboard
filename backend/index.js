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
if (!API_SECRET) console.warn('WARNING: API_SECRET not set. Defaulting to "53372".');
const EFFECTIVE_SECRET = API_SECRET || '53372';

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : ['https://mharisu.github.io', 'http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

let db;

// ---------- Helpers ----------

function generateId() { return `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`; }

function saveDB() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const tmp = path.join(os.tmpdir(), `closedboard_${process.pid}_${Date.now()}.db`);
    fs.writeFileSync(tmp, buffer);
    fs.renameSync(tmp, DB_PATH);
  } catch (e) { console.error('Failed to save database:', e.message); }
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

function columnExists(table, column) {
  return queryAll(`PRAGMA table_info(${table})`).some(c => c.name === column);
}

// ---------- Row mappers ----------

function rowToTask(row) {
  return {
    id: row.id, title: row.title, description: row.description,
    column: row.column_name, priority: row.priority,
    isAITask: Boolean(row.is_ai_task),
    tags: JSON.parse(row.tags || '[]'),
    subtasks: JSON.parse(row.subtasks || '[]'),
    resources: JSON.parse(row.resources || '[]'),
    createdAt: row.created_at, completedAt: row.completed_at,
    dueDate: row.due_date || null,
    timeEntries: JSON.parse(row.time_entries || '[]'),
    boardId: row.board_id || 'default'
  };
}

function rowToBoard(row) {
  return { id: row.id, name: row.name, color: row.color, createdAt: row.created_at };
}

function rowToTag(row) {
  return {
    id: row.id, label: row.label, color: row.color,
    isLearning: Boolean(row.is_learning),
    isLearningTopic: Boolean(row.is_learning_topic),
    createdAt: row.created_at
  };
}

// ---------- Data access ----------

function getAllTasks(boardId) {
  const tasks = {};
  const sql = boardId ? 'SELECT * FROM tasks WHERE board_id = ?' : 'SELECT * FROM tasks';
  const params = boardId ? [boardId] : [];
  for (const row of queryAll(sql, params)) { const t = rowToTask(row); tasks[t.id] = t; }
  return tasks;
}

function getHistory(boardId) {
  const sql = boardId
    ? 'SELECT * FROM history WHERE board_id = ? ORDER BY timestamp DESC LIMIT 50'
    : 'SELECT * FROM history ORDER BY timestamp DESC LIMIT 50';
  const params = boardId ? [boardId] : [];
  return queryAll(sql, params).map(r => ({
    id: r.id, action: r.action, taskId: r.task_id,
    timestamp: r.timestamp, message: r.message, boardId: r.board_id || 'default'
  }));
}

function getBoardData(boardId) {
  return { tasks: getAllTasks(boardId), history: getHistory(boardId), meta: { lastUpdated: Date.now() } };
}

function addHistory(action, taskId, message, boardId = 'default') {
  db.run(
    'INSERT INTO history (id, action, task_id, timestamp, message, board_id) VALUES (?, ?, ?, ?, ?, ?)',
    [generateId(), action, taskId, Date.now(), message, boardId]
  );
  db.run('DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY timestamp DESC LIMIT 100)');
}

function insertTask(task) {
  db.run(
    `INSERT INTO tasks (id, title, description, column_name, priority, is_ai_task,
     tags, subtasks, resources, created_at, completed_at, due_date, time_entries, board_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [task.id, task.title, task.description, task.column, task.priority,
     task.isAITask ? 1 : 0, JSON.stringify(task.tags), JSON.stringify(task.subtasks),
     JSON.stringify(task.resources), task.createdAt, task.completedAt,
     task.dueDate || null, JSON.stringify(task.timeEntries || []), task.boardId || 'default']
  );
}

function updateTaskRow(task) {
  db.run(
    `UPDATE tasks SET title=?, description=?, column_name=?, priority=?, is_ai_task=?,
     tags=?, subtasks=?, resources=?, created_at=?, completed_at=?,
     due_date=?, time_entries=?, board_id=? WHERE id=?`,
    [task.title, task.description, task.column, task.priority,
     task.isAITask ? 1 : 0, JSON.stringify(task.tags || []),
     JSON.stringify(task.subtasks || []), JSON.stringify(task.resources || []),
     task.createdAt, task.completedAt,
     task.dueDate || null, JSON.stringify(task.timeEntries || []),
     task.boardId || 'default', task.id]
  );
}

// ---------- SSE ----------

const sseClients = new Set();
function broadcastEvent(eventType, data) {
  const msg = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(msg); } catch { sseClients.delete(client); }
  }
}

// ---------- Middleware ----------

app.use(cors({ origin: CORS_ORIGINS, methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'], credentials: true }));
app.use(express.json());

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  if (header.slice(7) !== EFFECTIVE_SECRET) return res.status(401).json({ error: 'Invalid token' });
  next();
}

// ---------- Public ----------

app.get('/api/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.post('/api/auth', (req, res) => {
  const { pin } = req.body || {};
  if (pin === EFFECTIVE_SECRET) return res.json({ success: true });
  res.status(401).json({ success: false, error: 'Invalid PIN' });
});

// ---------- SSE ----------

app.get('/api/events', (req, res) => {
  if (req.query.token !== EFFECTIVE_SECRET) return res.status(401).json({ error: 'Authentication required' });
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache',
    'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);
  sseClients.add(res);
  const heartbeat = setInterval(() => { res.write(': keepalive\n\n'); }, 30000);
  req.on('close', () => { sseClients.delete(res); clearInterval(heartbeat); });
});

// ---------- Boards ----------

app.get('/api/boards', requireAuth, (_req, res) => {
  res.json({ boards: queryAll('SELECT * FROM boards ORDER BY created_at').map(rowToBoard) });
});

app.post('/api/boards', requireAuth, (req, res) => {
  const id = generateId();
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  db.run('INSERT INTO boards (id, name, color, created_at) VALUES (?,?,?,?)',
    [id, name.trim(), color || 'blue', Date.now()]);
  saveDB();
  const board = rowToBoard(queryOne('SELECT * FROM boards WHERE id = ?', [id]));
  broadcastEvent('board_created', { board });
  res.json({ success: true, board });
});

app.put('/api/boards/:id', requireAuth, (req, res) => {
  const row = queryOne('SELECT * FROM boards WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Board not found' });
  const { name, color } = req.body;
  db.run('UPDATE boards SET name=?, color=? WHERE id=?',
    [name?.trim() || row.name, color || row.color, req.params.id]);
  saveDB();
  const board = rowToBoard(queryOne('SELECT * FROM boards WHERE id = ?', [req.params.id]));
  broadcastEvent('board_updated', { board });
  res.json({ success: true, board });
});

app.delete('/api/boards/:id', requireAuth, (req, res) => {
  const count = queryAll('SELECT id FROM boards').length;
  if (count <= 1) return res.status(400).json({ error: 'Cannot delete the last board' });
  const taskCount = queryAll('SELECT id FROM tasks WHERE board_id = ?', [req.params.id]).length;
  if (taskCount > 0) return res.status(400).json({ error: `Board has ${taskCount} tasks. Move or delete them first.` });
  db.run('DELETE FROM boards WHERE id = ?', [req.params.id]);
  db.run('DELETE FROM history WHERE board_id = ?', [req.params.id]);
  saveDB();
  broadcastEvent('board_deleted', { boardId: req.params.id });
  res.json({ success: true });
});

// ---------- Custom Tags ----------

app.get('/api/tags', requireAuth, (_req, res) => {
  const tags = {};
  for (const row of queryAll('SELECT * FROM custom_tags ORDER BY created_at')) {
    tags[row.id] = rowToTag(row);
  }
  res.json({ tags });
});

app.post('/api/tags', requireAuth, (req, res) => {
  const { label, color, isLearning, isLearningTopic } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'Label required' });
  const id = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (queryOne('SELECT id FROM custom_tags WHERE id = ?', [id])) {
    return res.status(400).json({ error: 'Tag already exists' });
  }
  db.run('INSERT INTO custom_tags (id, label, color, is_learning, is_learning_topic, created_at) VALUES (?,?,?,?,?,?)',
    [id, label.trim(), color || 'bg-slate-500', isLearning ? 1 : 0, isLearningTopic ? 1 : 0, Date.now()]);
  saveDB();
  const tag = rowToTag(queryOne('SELECT * FROM custom_tags WHERE id = ?', [id]));
  broadcastEvent('tag_created', { tag });
  res.json({ success: true, tag });
});

app.put('/api/tags/:id', requireAuth, (req, res) => {
  const row = queryOne('SELECT * FROM custom_tags WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Tag not found' });
  const { label, color, isLearning, isLearningTopic } = req.body;
  db.run('UPDATE custom_tags SET label=?, color=?, is_learning=?, is_learning_topic=? WHERE id=?',
    [label?.trim() || row.label, color || row.color,
     isLearning !== undefined ? (isLearning ? 1 : 0) : row.is_learning,
     isLearningTopic !== undefined ? (isLearningTopic ? 1 : 0) : row.is_learning_topic,
     req.params.id]);
  saveDB();
  const tag = rowToTag(queryOne('SELECT * FROM custom_tags WHERE id = ?', [req.params.id]));
  broadcastEvent('tag_updated', { tag });
  res.json({ success: true, tag });
});

app.delete('/api/tags/:id', requireAuth, (req, res) => {
  if (!queryOne('SELECT id FROM custom_tags WHERE id = ?', [req.params.id])) {
    return res.status(404).json({ error: 'Tag not found' });
  }
  // Remove tag reference from all tasks
  const tasksWithTag = queryAll('SELECT id, tags FROM tasks');
  for (const row of tasksWithTag) {
    const tags = JSON.parse(row.tags || '[]');
    if (tags.includes(req.params.id)) {
      db.run('UPDATE tasks SET tags = ? WHERE id = ?',
        [JSON.stringify(tags.filter(t => t !== req.params.id)), row.id]);
    }
  }
  db.run('DELETE FROM custom_tags WHERE id = ?', [req.params.id]);
  saveDB();
  broadcastEvent('tag_deleted', { tagId: req.params.id });
  res.json({ success: true });
});

// ---------- Tasks ----------

app.get('/api/tasks', requireAuth, (req, res) => {
  const boardId = req.query.boardId || 'default';
  res.json(getBoardData(boardId));
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const id = generateId();
  const b = req.body;
  const task = {
    id, title: b.title || 'Untitled', description: b.description || '',
    column: b.column || 'backlog', priority: b.priority || 'medium',
    isAITask: b.isAITask || false, tags: b.tags || [],
    subtasks: b.subtasks || [], resources: b.resources || [],
    createdAt: Date.now(), completedAt: null,
    dueDate: b.dueDate || null, timeEntries: [],
    boardId: b.boardId || 'default'
  };
  insertTask(task);
  addHistory('created', id, `Created: "${task.title}"`, task.boardId);
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
  addHistory('updated', req.params.id, `Updated: "${task.title}"`, task.boardId);
  saveDB();
  broadcastEvent('task_updated', { task });
  res.json({ success: true, task });
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  const row = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ success: false, error: 'Task not found' });
  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  addHistory('deleted', req.params.id, `Deleted: "${row.title}"`, row.board_id || 'default');
  saveDB();
  broadcastEvent('task_deleted', { taskId: req.params.id, boardId: row.board_id || 'default' });
  res.json({ success: true });
});

app.post('/api/tasks/:id/move', requireAuth, (req, res) => {
  const row = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ success: false, error: 'Task not found' });
  const { column } = req.body;
  if (!['backlog', 'inProgress', 'completed'].includes(column))
    return res.status(400).json({ success: false, error: 'Invalid column' });
  const completedAt = column === 'completed' ? Date.now() : null;
  db.run('UPDATE tasks SET column_name = ?, completed_at = ? WHERE id = ?', [column, completedAt, req.params.id]);
  const task = rowToTask(queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]));
  const verb = column === 'completed' ? 'Completed' : 'Moved';
  addHistory(column === 'completed' ? 'completed' : 'moved', req.params.id, `${verb}: "${task.title}"`, task.boardId);
  saveDB();
  broadcastEvent('task_moved', { task });
  res.json({ success: true, task });
});

// ---------- Timer ----------

app.post('/api/tasks/:id/timer/start', requireAuth, (req, res) => {
  const row = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Task not found' });
  const entries = JSON.parse(row.time_entries || '[]');
  const last = entries[entries.length - 1];
  if (last && !last.end) return res.status(400).json({ error: 'Timer already running' });
  entries.push({ start: Date.now() });
  db.run('UPDATE tasks SET time_entries = ? WHERE id = ?', [JSON.stringify(entries), req.params.id]);
  saveDB();
  const task = rowToTask(queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]));
  broadcastEvent('task_updated', { task });
  res.json({ success: true, task });
});

app.post('/api/tasks/:id/timer/stop', requireAuth, (req, res) => {
  const row = queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Task not found' });
  const entries = JSON.parse(row.time_entries || '[]');
  const last = entries[entries.length - 1];
  if (!last || last.end) return res.status(400).json({ error: 'No timer running' });
  last.end = Date.now();
  db.run('UPDATE tasks SET time_entries = ? WHERE id = ?', [JSON.stringify(entries), req.params.id]);
  saveDB();
  const task = rowToTask(queryOne('SELECT * FROM tasks WHERE id = ?', [req.params.id]));
  broadcastEvent('task_updated', { task });
  res.json({ success: true, task });
});

// ---------- Export ----------

function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val);
  return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
}

function totalTimeMs(entries) {
  return (entries || []).reduce((sum, e) => e.end ? sum + (e.end - e.start) : sum, 0);
}

app.get('/api/export', requireAuth, (req, res) => {
  const boardId = req.query.boardId;
  const format = req.query.format || 'json';

  if (format === 'csv') {
    const tasks = Object.values(getAllTasks(boardId));
    const headers = ['ID','Title','Description','Column','Priority','Tags','Due Date','Time Spent (min)','Created','Completed'];
    const rows = tasks.map(t => [
      escapeCsv(t.id), escapeCsv(t.title), escapeCsv(t.description),
      escapeCsv(t.column), escapeCsv(t.priority),
      escapeCsv((t.tags || []).join('; ')),
      escapeCsv(t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : ''),
      escapeCsv(Math.round(totalTimeMs(t.timeEntries) / 60000)),
      escapeCsv(t.createdAt ? new Date(t.createdAt).toISOString() : ''),
      escapeCsv(t.completedAt ? new Date(t.completedAt).toISOString() : '')
    ].join(','));
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="closedboard-export-${Date.now()}.csv"`);
    return res.send([headers.join(','), ...rows].join('\n'));
  }

  const data = {
    tasks: getAllTasks(boardId),
    history: getHistory(boardId),
    boards: queryAll('SELECT * FROM boards ORDER BY created_at').map(rowToBoard),
    tags: (() => { const t = {}; queryAll('SELECT * FROM custom_tags').forEach(r => { t[r.id] = rowToTag(r); }); return t; })(),
    exportedAt: new Date().toISOString()
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="closedboard-export-${Date.now()}.json"`);
  res.json(data);
});

// ---------- Migration ----------

const DEFAULT_TAGS = {
  feature: { label: 'Feature', color: 'bg-purple-500' },
  bug: { label: 'Bug', color: 'bg-red-500' },
  improvement: { label: 'Improvement', color: 'bg-blue-500' },
  research: { label: 'Research', color: 'bg-cyan-500' },
  personal: { label: 'Personal', color: 'bg-pink-500' },
  work: { label: 'Work', color: 'bg-amber-500' },
  ai: { label: 'AI Task', color: 'bg-violet-500' },
  learning: { label: 'Learning', color: 'bg-gradient-to-r from-violet-500 to-purple-500', isLearning: true },
  'react-native': { label: 'React Native', color: 'bg-cyan-500', isLearningTopic: true },
  'aws-sst': { label: 'AWS SST', color: 'bg-orange-500', isLearningTopic: true },
  javascript: { label: 'JavaScript', color: 'bg-yellow-500', isLearningTopic: true }
};

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
        createdAt: task.createdAt || Date.now(), completedAt: task.completedAt || null,
        dueDate: null, timeEntries: [], boardId: 'default'
      });
    }
    if (legacy.history) {
      for (const e of legacy.history) {
        db.run('INSERT OR IGNORE INTO history (id,action,task_id,timestamp,message,board_id) VALUES (?,?,?,?,?,?)',
          [e.id, e.action, e.taskId, e.timestamp, e.message, 'default']);
      }
    }
    saveDB();
    fs.renameSync(jsonPath, jsonPath + '.migrated');
    console.log(`Migrated ${Object.keys(legacy.tasks).length} tasks from data.json`);
  } catch (e) { console.error('JSON migration failed:', e.message); }
}

// ---------- Graceful shutdown ----------

process.on('SIGTERM', () => { if (db) { saveDB(); db.close(); } process.exit(0); });

// ---------- Start ----------

(async () => {
  const SQL = await initSqlJs();
  try {
    if (fs.existsSync(DB_PATH)) { db = new SQL.Database(fs.readFileSync(DB_PATH)); console.log('Loaded existing database'); }
    else { db = new SQL.Database(); console.log('Created new database'); }
  } catch (e) { console.error('DB load failed, creating fresh:', e.message); db = new SQL.Database(); }

  // Core tables
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

  // Schema migrations — add columns if missing
  if (!columnExists('tasks', 'due_date')) db.run('ALTER TABLE tasks ADD COLUMN due_date INTEGER');
  if (!columnExists('tasks', 'time_entries')) db.run("ALTER TABLE tasks ADD COLUMN time_entries TEXT DEFAULT '[]'");
  if (!columnExists('tasks', 'board_id')) db.run("ALTER TABLE tasks ADD COLUMN board_id TEXT DEFAULT 'default'");
  if (!columnExists('history', 'board_id')) db.run("ALTER TABLE history ADD COLUMN board_id TEXT DEFAULT 'default'");

  // Boards table
  db.run(`CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT DEFAULT 'blue', created_at INTEGER NOT NULL
  )`);

  // Custom tags table
  db.run(`CREATE TABLE IF NOT EXISTS custom_tags (
    id TEXT PRIMARY KEY, label TEXT NOT NULL, color TEXT NOT NULL,
    is_learning INTEGER DEFAULT 0, is_learning_topic INTEGER DEFAULT 0, created_at INTEGER NOT NULL
  )`);

  // Seed default board
  if (queryAll('SELECT id FROM boards').length === 0) {
    db.run('INSERT INTO boards (id, name, color, created_at) VALUES (?,?,?,?)',
      ['default', 'My Board', 'blue', Date.now()]);
    console.log('Seeded default board');
  }

  // Seed default tags
  if (queryAll('SELECT id FROM custom_tags').length === 0) {
    for (const [id, tag] of Object.entries(DEFAULT_TAGS)) {
      db.run('INSERT INTO custom_tags (id, label, color, is_learning, is_learning_topic, created_at) VALUES (?,?,?,?,?,?)',
        [id, tag.label, tag.color, tag.isLearning ? 1 : 0, tag.isLearningTopic ? 1 : 0, Date.now()]);
    }
    console.log(`Seeded ${Object.keys(DEFAULT_TAGS).length} default tags`);
  }

  migrateFromJSON();
  saveDB();

  const taskCount = queryAll('SELECT id FROM tasks').length;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClosedBoard API running on port ${PORT}`);
    console.log(`Storage: SQLite via sql.js (${DB_PATH})`);
    console.log(`Tasks: ${taskCount} | SSE: enabled | Auth: ${API_SECRET ? 'set' : 'default'}`);
    console.log(`CORS: ${CORS_ORIGINS.join(', ')}`);
  });
})().catch(err => { console.error('Startup failed:', err); process.exit(1); });
