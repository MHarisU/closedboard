import { useState, useEffect, useCallback, useRef } from 'react';
import {
  API_BASE, getAuthToken, fetchTasks, createTask, updateTask,
  deleteTask, moveTask, checkAPIHealth
} from '../utils/api';
import { enqueue, getPendingCount, replayQueue } from '../utils/syncQueue';

export const useBoard = () => {
  const [data, setData] = useState({ tasks: {}, history: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [pendingSync, setPendingSync] = useState(0);

  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchTasks();
      setData(result);
      setLastSync(Date.now());
    } catch (e) {
      console.warn('Refresh failed', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      const isUp = await checkAPIHealth();
      setConnected(isUp);
      try {
        const result = await fetchTasks();
        setData(result);
        setLastSync(Date.now());
      } catch (e) {
        console.warn('Initial fetch failed', e);
      }
      setPendingSync(getPendingCount());
      setLoading(false);
    })();
  }, []);

  // SSE — replaces 30s polling
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const url = `${API_BASE}/events?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);

    source.addEventListener('connected', async () => {
      setConnected(true);

      const pending = getPendingCount();
      if (pending > 0) {
        const result = await replayQueue({
          create: createTask, update: updateTask,
          delete: deleteTask, move: moveTask
        });
        setPendingSync(result.remaining);
        if (result.replayed > 0) {
          const fresh = await fetchTasks();
          setData(fresh);
          setLastSync(Date.now());
          return;
        }
      }

      try {
        const fresh = await fetchTasks();
        setData(fresh);
        setLastSync(Date.now());
      } catch {}
    });

    source.addEventListener('task_created', (e) => {
      const { task } = JSON.parse(e.data);
      setData(prev => ({ ...prev, tasks: { ...prev.tasks, [task.id]: task } }));
      setLastSync(Date.now());
    });

    source.addEventListener('task_updated', (e) => {
      const { task } = JSON.parse(e.data);
      setData(prev => ({ ...prev, tasks: { ...prev.tasks, [task.id]: task } }));
      setLastSync(Date.now());
    });

    source.addEventListener('task_deleted', (e) => {
      const { taskId } = JSON.parse(e.data);
      setData(prev => {
        const { [taskId]: _, ...rest } = prev.tasks;
        return { ...prev, tasks: rest };
      });
      setLastSync(Date.now());
    });

    source.addEventListener('task_moved', (e) => {
      const { task } = JSON.parse(e.data);
      setData(prev => ({ ...prev, tasks: { ...prev.tasks, [task.id]: task } }));
      setLastSync(Date.now());
    });

    source.onerror = () => setConnected(false);

    return () => source.close();
  }, []);

  const tempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const addTask = useCallback(async (task) => {
    const optId = tempId();
    const optTask = {
      id: optId, ...task, createdAt: Date.now(),
      isAITask: task.isAITask || false, tags: task.tags || [], subtasks: task.subtasks || []
    };

    setData(prev => ({
      ...prev,
      tasks: { ...prev.tasks, [optId]: optTask },
      history: [{ id: tempId(), action: 'created', taskId: optId,
        timestamp: Date.now(), message: `Created: "${task.title}"` }, ...prev.history].slice(0, 50)
    }));

    const result = await createTask(task);

    if (result.success) {
      setData(prev => {
        const { [optId]: _, ...rest } = prev.tasks;
        return { ...prev, tasks: { ...rest, [result.task.id]: result.task } };
      });
    } else if (result.offline) {
      enqueue({ type: 'create', data: task });
      setPendingSync(getPendingCount());
    } else {
      setData(prev => {
        const { [optId]: _, ...rest } = prev.tasks;
        return { ...prev, tasks: rest };
      });
    }
    return result;
  }, []);

  const handleMoveTask = useCallback(async (taskId, newColumn) => {
    const snapshot = dataRef.current.tasks[taskId];
    if (!snapshot) return { error: 'Task not found' };

    setData(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: { ...prev.tasks[taskId], column: newColumn,
          ...(newColumn === 'completed' ? { completedAt: Date.now() } : {}) }
      },
      history: [{ id: tempId(),
        action: newColumn === 'completed' ? 'completed' : 'moved',
        taskId, timestamp: Date.now(),
        message: `${newColumn === 'completed' ? 'Completed' : 'Moved'}: "${snapshot.title}"`
      }, ...prev.history].slice(0, 50)
    }));

    const result = await moveTask(taskId, newColumn);

    if (result.offline) {
      enqueue({ type: 'move', taskId, data: { column: newColumn } });
      setPendingSync(getPendingCount());
    } else if (!result.success) {
      setData(prev => ({ ...prev, tasks: { ...prev.tasks, [taskId]: snapshot } }));
    }
    return result;
  }, []);

  const handleUpdateTask = useCallback(async (taskId, updates) => {
    const snapshot = dataRef.current.tasks[taskId];
    if (!snapshot) return { error: 'Task not found' };

    setData(prev => ({
      ...prev,
      tasks: { ...prev.tasks, [taskId]: { ...prev.tasks[taskId], ...updates } }
    }));

    const result = await updateTask(taskId, updates);

    if (result.offline) {
      enqueue({ type: 'update', taskId, data: updates });
      setPendingSync(getPendingCount());
    } else if (!result.success) {
      setData(prev => ({ ...prev, tasks: { ...prev.tasks, [taskId]: snapshot } }));
    }
    return result;
  }, []);

  const handleUpdateSubtasks = useCallback(async (taskId, subtasks) => {
    return handleUpdateTask(taskId, { subtasks });
  }, [handleUpdateTask]);

  const handleDeleteTask = useCallback(async (taskId) => {
    const snapshot = dataRef.current.tasks[taskId];
    if (!snapshot) return { error: 'Task not found' };

    setData(prev => {
      const { [taskId]: _, ...rest } = prev.tasks;
      return {
        ...prev, tasks: rest,
        history: [{ id: tempId(), action: 'deleted', taskId,
          timestamp: Date.now(), message: `Deleted: "${snapshot.title}"`
        }, ...prev.history].slice(0, 50)
      };
    });

    const result = await deleteTask(taskId);

    if (result.offline) {
      enqueue({ type: 'delete', taskId });
      setPendingSync(getPendingCount());
    } else if (!result.success) {
      setData(prev => ({ ...prev, tasks: { ...prev.tasks, [taskId]: snapshot } }));
    }
    return result;
  }, []);

  const getTasksByColumn = useCallback((columnId, searchQuery = '') => {
    const q = searchQuery.toLowerCase();
    return Object.values(data.tasks || {})
      .filter(task => {
        if (task.column !== columnId) return false;
        if (!q) return true;
        return task.title.toLowerCase().includes(q) ||
          (task.description || '').toLowerCase().includes(q) ||
          (task.tags || []).some(tag => tag.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const o = { urgent: 0, high: 1, medium: 2, low: 3 };
        return o[a.priority] - o[b.priority];
      });
  }, [data.tasks]);

  const getArchivedTasks = useCallback((searchQuery = '') => {
    const q = searchQuery.toLowerCase();
    return Object.values(data.tasks || {})
      .filter(task => {
        if (task.column !== 'completed') return false;
        if (!q) return true;
        return task.title.toLowerCase().includes(q) ||
          (task.description || '').toLowerCase().includes(q);
      })
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }, [data.tasks]);

  const getCurrentlyWorking = useCallback(() => {
    return Object.values(data.tasks || {})
      .filter(task => task.column === 'inProgress' && task.isAITask);
  }, [data.tasks]);

  const resetBoard = useCallback(async () => { await refresh(); }, [refresh]);

  return {
    tasks: data.tasks || {},
    history: data.history || [],
    loading, connected, lastSync, pendingSync,
    addTask,
    moveTask: handleMoveTask,
    updateTask: handleUpdateTask,
    updateSubtasks: handleUpdateSubtasks,
    deleteTask: handleDeleteTask,
    getTasksByColumn, getArchivedTasks, getCurrentlyWorking,
    resetBoard, refresh
  };
};
