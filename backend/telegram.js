let TelegramBot;
try { TelegramBot = require('node-telegram-bot-api'); } catch { TelegramBot = null; }

function initBot({ getAllTasks, addHistory, insertTask, moveToCompleted, generateId, EFFECTIVE_SECRET }) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.log('Telegram bot: disabled (no TELEGRAM_BOT_TOKEN)'); return null; }
  if (!TelegramBot) { console.warn('Telegram bot: node-telegram-bot-api not installed'); return null; }

  const authorizedChats = process.env.TELEGRAM_CHAT_IDS
    ? process.env.TELEGRAM_CHAT_IDS.split(',').map(s => s.trim())
    : [];

  const bot = new TelegramBot(token, { polling: true });
  const lastLists = new Map();

  const isAuth = (chatId) => authorizedChats.length === 0 || authorizedChats.includes(String(chatId));

  const priorityEmoji = { urgent: '🔴', high: '🟠', medium: '🟡', low: '🟢' };

  bot.onText(/\/start/, (msg) => {
    if (!isAuth(msg.chat.id)) return;
    bot.sendMessage(msg.chat.id, [
      '*ClosedBoard Bot*', '',
      'Commands:',
      '`/add <title>` — Create a backlog task',
      '`/list` — In-progress tasks',
      '`/backlog` — Backlog tasks',
      '`/done <#>` — Complete task # from last /list',
      '`/status` — Board overview',
      '`/help` — This message'
    ].join('\n'), { parse_mode: 'Markdown' });
  });

  bot.onText(/\/help/, (msg) => {
    if (!isAuth(msg.chat.id)) return;
    bot.sendMessage(msg.chat.id, [
      '*Commands:*',
      '`/add <title>` — Create task in Backlog',
      '`/list` — Show in-progress tasks',
      '`/backlog` — Show backlog tasks',
      '`/done <#>` — Mark task as completed',
      '`/status` — Board statistics'
    ].join('\n'), { parse_mode: 'Markdown' });
  });

  bot.onText(/\/add (.+)/, (msg, match) => {
    if (!isAuth(msg.chat.id)) return;
    const title = match[1].trim();
    try {
      const task = {
        id: generateId(), title, description: '', column: 'backlog',
        priority: 'medium', isAITask: false, tags: [], subtasks: [], resources: [],
        createdAt: Date.now(), completedAt: null, dueDate: null, timeEntries: [],
        boardId: 'default', blockedBy: [], githubIssue: null
      };
      insertTask(task);
      addHistory('created', task.id, `Created via Telegram: "${title}"`, 'default');
      bot.sendMessage(msg.chat.id, `✅ Created: "${title}" in Backlog`);
    } catch (e) {
      bot.sendMessage(msg.chat.id, `❌ Failed: ${e.message}`);
    }
  });

  const sendTaskList = (chatId, tasks, label) => {
    if (tasks.length === 0) {
      bot.sendMessage(chatId, `📋 No ${label} tasks`);
      return;
    }
    lastLists.set(chatId, tasks.map(t => t.id));
    const lines = tasks.map((t, i) => {
      const p = priorityEmoji[t.priority] || '⚪';
      const due = t.dueDate ? ` 📅${new Date(t.dueDate).toLocaleDateString()}` : '';
      return `${i + 1}. ${p} ${t.title}${due}`;
    });
    bot.sendMessage(chatId, `📋 *${label} (${tasks.length}):*\n\n${lines.join('\n')}\n\nUse \`/done <#>\` to complete`,
      { parse_mode: 'Markdown' });
  };

  bot.onText(/\/list$/, (msg) => {
    if (!isAuth(msg.chat.id)) return;
    const all = getAllTasks();
    const inProgress = Object.values(all)
      .filter(t => t.column === 'inProgress')
      .sort((a, b) => { const o = { urgent: 0, high: 1, medium: 2, low: 3 }; return (o[a.priority] ?? 2) - (o[b.priority] ?? 2); });
    sendTaskList(msg.chat.id, inProgress, 'In Progress');
  });

  bot.onText(/\/backlog$/, (msg) => {
    if (!isAuth(msg.chat.id)) return;
    const all = getAllTasks();
    const backlog = Object.values(all)
      .filter(t => t.column === 'backlog')
      .sort((a, b) => { const o = { urgent: 0, high: 1, medium: 2, low: 3 }; return (o[a.priority] ?? 2) - (o[b.priority] ?? 2); });
    sendTaskList(msg.chat.id, backlog, 'Backlog');
  });

  bot.onText(/\/done (.+)/, (msg, match) => {
    if (!isAuth(msg.chat.id)) return;
    const arg = match[1].trim();
    const idx = parseInt(arg, 10);

    let taskId = null;
    if (!isNaN(idx) && idx > 0) {
      const list = lastLists.get(msg.chat.id);
      if (!list) { bot.sendMessage(msg.chat.id, 'Run /list or /backlog first, then use /done <#>'); return; }
      taskId = list[idx - 1];
      if (!taskId) { bot.sendMessage(msg.chat.id, `Invalid number. You have ${list.length} tasks.`); return; }
    } else {
      const all = getAllTasks();
      const match = Object.values(all).find(t =>
        t.column !== 'completed' && t.title.toLowerCase().includes(arg.toLowerCase())
      );
      if (match) taskId = match.id;
    }

    if (!taskId) { bot.sendMessage(msg.chat.id, `Task not found: "${arg}"`); return; }
    const task = moveToCompleted(taskId);
    if (task) bot.sendMessage(msg.chat.id, `✅ Completed: "${task.title}"`);
    else bot.sendMessage(msg.chat.id, 'Task not found or already completed.');
  });

  bot.onText(/\/status$/, (msg) => {
    if (!isAuth(msg.chat.id)) return;
    const all = Object.values(getAllTasks());
    const backlog = all.filter(t => t.column === 'backlog').length;
    const inProg = all.filter(t => t.column === 'inProgress').length;
    const done = all.filter(t => t.column === 'completed').length;
    const overdue = all.filter(t => t.dueDate && t.dueDate < Date.now() && t.column !== 'completed').length;

    const now = Date.now();
    const DAY = 86400000;
    const completionDays = new Set(
      all.filter(t => t.completedAt).map(t => Math.floor(t.completedAt / DAY))
    );
    let streak = 0;
    let day = Math.floor(now / DAY);
    while (completionDays.has(day) || (streak === 0 && completionDays.has(day - 1))) {
      if (streak === 0 && !completionDays.has(day)) day--;
      streak++;
      day--;
    }

    const lines = [
      `📊 *Board Status*`, '',
      `📥 Backlog: ${backlog}`,
      `🔄 In Progress: ${inProg}`,
      `✅ Completed: ${done}`,
    ];
    if (overdue > 0) lines.push(`⚠️ Overdue: ${overdue}`);
    if (streak > 0) lines.push(`🔥 Streak: ${streak} day${streak !== 1 ? 's' : ''}`);

    bot.sendMessage(msg.chat.id, lines.join('\n'), { parse_mode: 'Markdown' });
  });

  bot.on('polling_error', (err) => { if (err.code !== 'ETELEGRAM') console.error('Telegram polling error:', err.message); });

  console.log('Telegram bot: active');
  return bot;
}

module.exports = { initBot };
