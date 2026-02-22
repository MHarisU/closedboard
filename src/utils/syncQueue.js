const QUEUE_KEY = 'closedboard_sync_queue';

function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
  catch { return []; }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(operation) {
  const queue = getQueue();
  queue.push({ ...operation, queuedAt: Date.now() });
  saveQueue(queue);
}

export function getPendingCount() {
  return getQueue().length;
}

export function clearQueue() {
  saveQueue([]);
}

export async function replayQueue(apiFns) {
  const queue = getQueue();
  if (queue.length === 0) return { replayed: 0, remaining: 0 };

  let replayed = 0;
  for (let i = 0; i < queue.length; i++) {
    const op = queue[i];
    let result;
    try {
      switch (op.type) {
        case 'create': result = await apiFns.create(op.data); break;
        case 'update': result = await apiFns.update(op.taskId, op.data); break;
        case 'delete': result = await apiFns.delete(op.taskId); break;
        case 'move':   result = await apiFns.move(op.taskId, op.data.column); break;
      }
    } catch {
      const remaining = queue.slice(i);
      saveQueue(remaining);
      return { replayed, remaining: remaining.length };
    }
    if (result?.offline) {
      const remaining = queue.slice(i);
      saveQueue(remaining);
      return { replayed, remaining: remaining.length };
    }
    replayed++;
  }

  saveQueue([]);
  return { replayed, remaining: 0 };
}
