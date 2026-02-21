const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const initSqlJs = require('sql.js');
const { initBot } = require('./telegram');

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
    boardId: row.board_id || 'default',
    blockedBy: JSON.parse(row.blocked_by || '[]'),
    githubIssue: row.github_issue ? JSON.parse(row.github_issue) : null
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
     tags, subtasks, resources, created_at, completed_at, due_date, time_entries, board_id, blocked_by, github_issue)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [task.id, task.title, task.description, task.column, task.priority,
     task.isAITask ? 1 : 0, JSON.stringify(task.tags), JSON.stringify(task.subtasks),
     JSON.stringify(task.resources), task.createdAt, task.completedAt,
     task.dueDate || null, JSON.stringify(task.timeEntries || []), task.boardId || 'default',
     JSON.stringify(task.blockedBy || []), task.githubIssue ? JSON.stringify(task.githubIssue) : null]
  );
}

function updateTaskRow(task) {
  db.run(
    `UPDATE tasks SET title=?, description=?, column_name=?, priority=?, is_ai_task=?,
     tags=?, subtasks=?, resources=?, created_at=?, completed_at=?,
     due_date=?, time_entries=?, board_id=?, blocked_by=?, github_issue=? WHERE id=?`,
    [task.title, task.description, task.column, task.priority,
     task.isAITask ? 1 : 0, JSON.stringify(task.tags || []),
     JSON.stringify(task.subtasks || []), JSON.stringify(task.resources || []),
     task.createdAt, task.completedAt,
     task.dueDate || null, JSON.stringify(task.timeEntries || []),
     task.boardId || 'default', JSON.stringify(task.blockedBy || []),
     task.githubIssue ? JSON.stringify(task.githubIssue) : null, task.id]
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
app.use(express.json({
  verify: (req, _res, buf) => { if (req.url.startsWith('/api/webhooks/github')) req.rawBody = buf; }
}));

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
  if (req.params.id === 'default') return res.status(400).json({ error: 'Cannot delete the default board' });
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
    dueDate: b.dueDate || null, timeEntries: b.timeEntries || [],
    boardId: b.boardId || 'default', blockedBy: b.blockedBy || [],
    githubIssue: b.githubIssue || null
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

  if (column === 'completed') {
    const unblocked = queryAll('SELECT * FROM tasks WHERE blocked_by LIKE ?', [`%${req.params.id}%`]);
    for (const r of unblocked) {
      const blockers = JSON.parse(r.blocked_by || '[]');
      if (!blockers.includes(req.params.id)) continue;
      const allDone = blockers.every(bid => {
        const b = queryOne('SELECT column_name FROM tasks WHERE id = ?', [bid]);
        return b && b.column_name === 'completed';
      });
      if (allDone) broadcastEvent('task_unblocked', { taskId: r.id, title: r.title, unblockedBy: task.title });
    }
    if (task.githubIssue && process.env.GITHUB_TOKEN) {
      const { owner, repo, number } = task.githubIssue;
      closeGitHubIssue(owner, repo, number).catch(e => console.error('GitHub close failed:', e.message));
    }
  }

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
    const headers = ['ID','Title','Description','Column','Priority','Tags','Due Date','Time Spent (min)','Created','Completed','Blocked By'];
    const rows = tasks.map(t => [
      escapeCsv(t.id), escapeCsv(t.title), escapeCsv(t.description),
      escapeCsv(t.column), escapeCsv(t.priority),
      escapeCsv((t.tags || []).join('; ')),
      escapeCsv(t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : ''),
      escapeCsv(Math.round(totalTimeMs(t.timeEntries) / 60000)),
      escapeCsv(t.createdAt ? new Date(t.createdAt).toISOString() : ''),
      escapeCsv(t.completedAt ? new Date(t.completedAt).toISOString() : ''),
      escapeCsv((t.blockedBy || []).join('; '))
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

// ---------- GitHub helpers ----------

async function closeGitHubIssue(owner, repo, number) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return;
  await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${number}`, {
    method: 'PATCH',
    headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'closed' })
  });
}

function verifyGitHubSignature(payload, signature) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

const LABEL_TO_TAG = { bug: 'bug', enhancement: 'feature', feature: 'feature', documentation: 'research', 'help wanted': 'improvement' };

app.post('/api/webhooks/github', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  if (process.env.GITHUB_WEBHOOK_SECRET) {
    if (!signature || !req.rawBody || !verifyGitHubSignature(req.rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }
  const event = req.headers['x-github-event'];
  const payload = req.body;

  if (event === 'issues') {
    const { action, issue, repository } = payload;
    const ghRef = { owner: repository.owner.login, repo: repository.name, number: issue.number, url: issue.html_url };

    if (action === 'opened' || action === 'reopened') {
      const existing = queryAll('SELECT * FROM tasks').find(r => {
        const gi = r.github_issue ? JSON.parse(r.github_issue) : null;
        return gi && gi.owner === ghRef.owner && gi.repo === ghRef.repo && gi.number === ghRef.number;
      });
      if (existing) {
        if (action === 'reopened' && existing.column_name === 'completed') {
          db.run('UPDATE tasks SET column_name = ?, completed_at = NULL WHERE id = ?', ['backlog', existing.id]);
          const task = rowToTask(queryOne('SELECT * FROM tasks WHERE id = ?', [existing.id]));
          addHistory('moved', existing.id, `Reopened from GitHub: "${task.title}"`, task.boardId);
          saveDB();
          broadcastEvent('task_moved', { task });
        }
        return res.json({ success: true, action: 'updated' });
      }
      const tags = (issue.labels || []).map(l => LABEL_TO_TAG[l.name.toLowerCase()]).filter(Boolean);
      const task = {
        id: generateId(), title: `[${repository.name}] ${issue.title}`,
        description: (issue.body || '').substring(0, 500),
        column: 'backlog', priority: tags.includes('bug') ? 'high' : 'medium',
        isAITask: false, tags, subtasks: [], resources: [{ title: 'GitHub Issue', url: issue.html_url }],
        createdAt: Date.now(), completedAt: null, dueDate: null, timeEntries: [],
        boardId: 'default', blockedBy: [], githubIssue: ghRef
      };
      insertTask(task);
      addHistory('created', task.id, `From GitHub: "${task.title}"`, task.boardId);
      saveDB();
      broadcastEvent('task_created', { task });
      return res.json({ success: true, action: 'created', taskId: task.id });
    }

    if (action === 'closed') {
      const row = queryAll('SELECT * FROM tasks').find(r => {
        const gi = r.github_issue ? JSON.parse(r.github_issue) : null;
        return gi && gi.owner === ghRef.owner && gi.repo === ghRef.repo && gi.number === ghRef.number;
      });
      if (row && row.column_name !== 'completed') {
        db.run('UPDATE tasks SET column_name = ?, completed_at = ? WHERE id = ?', ['completed', Date.now(), row.id]);
        const task = rowToTask(queryOne('SELECT * FROM tasks WHERE id = ?', [row.id]));
        addHistory('completed', row.id, `Closed from GitHub: "${task.title}"`, task.boardId);
        saveDB();
        broadcastEvent('task_moved', { task });
      }
      return res.json({ success: true, action: 'closed' });
    }
  }

  res.json({ success: true, action: 'ignored' });
});

// ---------- Insights (Ghost Tasks) ----------

app.get('/api/insights', requireAuth, (req, res) => {
  const boardId = req.query.boardId || 'default';
  const tasks = getAllTasks(boardId);
  const taskList = Object.values(tasks);
  const now = Date.now();
  const DAY_MS = 86400000;
  const insights = [];

  // 1. Stale detection — tasks created >7 days ago, still in backlog/inProgress
  for (const t of taskList) {
    if (t.column === 'completed') continue;
    const ageDays = Math.floor((now - t.createdAt) / DAY_MS);
    if (ageDays >= 7) {
      insights.push({
        type: 'stale', taskId: t.id, taskTitle: t.title, column: t.column, daysAgo: ageDays,
        message: `You created "${t.title}" ${ageDays} days ago and it hasn't moved. Still relevant?`
      });
    }
  }

  // 2. Velocity prediction
  const completed14d = taskList.filter(t => t.completedAt && (now - t.completedAt) < 14 * DAY_MS);
  const velocity = completed14d.length / 14;
  const backlogCount = taskList.filter(t => t.column === 'backlog').length;
  if (velocity > 0 && backlogCount > 0) {
    const estDays = Math.round((backlogCount / velocity) * 10) / 10;
    insights.push({
      type: 'velocity', velocity: Math.round(velocity * 100) / 100, backlogCount, estimatedDays: estDays,
      message: `Based on your average of ${(Math.round(velocity * 10) / 10)} tasks/day, your ${backlogCount} backlog tasks will take ~${estDays} days`
    });
  }

  // 3. Day-of-week pattern recognition
  const dayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  const completedAll = taskList.filter(t => t.completedAt);
  for (const t of completedAll) dayCounts[new Date(t.completedAt).getDay()]++;
  if (completedAll.length >= 5) {
    const sorted = dayCounts.map((c, i) => ({ day: i, count: c })).sort((a, b) => b.count - a.count);
    const topDays = sorted.slice(0, 2).filter(d => d.count > 0);
    if (topDays.length >= 2 && topDays[0].count > (sorted[2]?.count ?? 0)) {
      insights.push({
        type: 'pattern',
        topDays: topDays.map(d => ({ day: dayNames[d.day], count: d.count })),
        message: `You complete more tasks on ${topDays.map(d => dayNames[d.day]).join(' and ')}. Consider scheduling hard tasks then.`
      });
    }
  }

  // 4. Subtask completion estimation
  for (const t of taskList) {
    if (t.column === 'completed' || !t.subtasks || t.subtasks.length < 3) continue;
    const done = t.subtasks.filter(s => s.completed).length;
    if (done === 0 || done === t.subtasks.length) continue;
    const elapsedDays = Math.max((now - t.createdAt) / DAY_MS, 1);
    const pacePerDay = done / elapsedDays;
    const remaining = t.subtasks.length - done;
    const estDays = Math.round((remaining / pacePerDay) * 10) / 10;
    insights.push({
      type: 'subtask_estimate', taskId: t.id, taskTitle: t.title,
      done, total: t.subtasks.length, estimatedDays: estDays,
      message: `${done}/${t.subtasks.length} subtasks done, ~${estDays} days remaining at your pace`
    });
  }

  // 5. Streak — consecutive days with completions (bonus)
  if (completedAll.length > 0) {
    const completionDays = new Set(completedAll.map(t => Math.floor(t.completedAt / DAY_MS)));
    let streak = 0;
    let day = Math.floor(now / DAY_MS);
    while (completionDays.has(day) || (streak === 0 && completionDays.has(day - 1))) {
      if (streak === 0 && !completionDays.has(day)) day--;
      streak++;
      day--;
    }
    if (streak >= 2) {
      insights.push({ type: 'streak', streak, message: `You're on a ${streak}-day completion streak! Keep it going.` });
    }
  }

  res.json({ insights });
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
  if (!columnExists('tasks', 'blocked_by')) db.run("ALTER TABLE tasks ADD COLUMN blocked_by TEXT DEFAULT '[]'");
  if (!columnExists('tasks', 'github_issue')) db.run("ALTER TABLE tasks ADD COLUMN github_issue TEXT DEFAULT NULL");
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
    if (process.env.GITHUB_WEBHOOK_SECRET) console.log('GitHub webhook: enabled');
    if (process.env.GITHUB_TOKEN) console.log('GitHub auto-close: enabled');
  });

  initBot({
    getAllTasks: () => getAllTasks(),
    addHistory,
    saveDB,
    insertTask: (task) => { insertTask(task); saveDB(); broadcastEvent('task_created', { task }); },
    moveToCompleted: (taskId) => {
      const row = queryOne('SELECT * FROM tasks WHERE id = ?', [taskId]);
      if (!row || row.column_name === 'completed') return null;
      db.run('UPDATE tasks SET column_name = ?, completed_at = ? WHERE id = ?', ['completed', Date.now(), taskId]);
      saveDB();
      const task = rowToTask(queryOne('SELECT * FROM tasks WHERE id = ?', [taskId]));
      addHistory('completed', taskId, `Completed via Telegram: "${task.title}"`, task.boardId);
      broadcastEvent('task_moved', { task });
      if (task.githubIssue && process.env.GITHUB_TOKEN) {
        closeGitHubIssue(task.githubIssue.owner, task.githubIssue.repo, task.githubIssue.number).catch(() => {});
      }
      return task;
    },
    generateId,
    EFFECTIVE_SECRET
  });
})().catch(err => { console.error('Startup failed:', err); process.exit(1); });
