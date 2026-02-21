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

  const failed = [];
  for (const op of queue) {
    let result;
    try {
      switch (op.type) {
        case 'create': result = await apiFns.create(op.data); break;
        case 'update': result = await apiFns.update(op.taskId, op.data); break;
        case 'delete': result = await apiFns.delete(op.taskId); break;
        case 'move':   result = await apiFns.move(op.taskId, op.data.column); break;
      }
    } catch {
      failed.push(op);
      break;
    }
    if (result?.offline) {
      failed.push(op);
      break;
    }
  }

  saveQueue(failed);
  return { replayed: queue.length - failed.length, remaining: failed.length };
}
