import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTasks, createTask, updateTask, deleteTask, moveTask, checkAPIHealth } from '../utils/api';

export const useBoard = () => {
  const [data, setData] = useState({ tasks: {}, history: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const refreshInterval = useRef(null);

  // Ref that always holds the latest data — avoids stale closures in callbacks
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const isConnected = await checkAPIHealth();
      setConnected(isConnected);
      try {
        const result = await fetchTasks();
        setData(result);
        setLastSync(Date.now());
      } catch (e) {
        console.warn('Initial fetch failed', e);
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    refreshInterval.current = setInterval(async () => {
      try {
        const result = await fetchTasks();
        setData(result);
        setLastSync(Date.now());
      } catch (e) {
        console.warn('Auto-refresh failed', e);
      }
    }, 30000);

    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchTasks();
      setData(result);
      setLastSync(Date.now());
    } catch (e) {
      console.warn('Refresh failed', e);
    }
  }, []);

  const tempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // Stable callback — reads latest data via dataRef, no dependency on data.tasks
  const addTask = useCallback(async (task) => {
    const optimisticId = tempId();
    const optimisticTask = {
      id: optimisticId,
      ...task,
      createdAt: Date.now(),
      isAITask: task.isAITask || false,
      tags: task.tags || [],
      subtasks: task.subtasks || []
    };

    setData(prev => ({
      ...prev,
      tasks: { ...prev.tasks, [optimisticId]: optimisticTask },
      history: [{
        id: tempId(), action: 'created', taskId: optimisticId,
        timestamp: Date.now(), message: `Created: "${task.title}"`
      }, ...prev.history].slice(0, 50)
    }));

    const result = await createTask(task);

    if (result.success) {
      await refresh();
    } else {
      setData(prev => {
        const { [optimisticId]: _, ...rest } = prev.tasks;
        return { ...prev, tasks: rest };
      });
    }
    return result;
  }, [refresh]);

  const handleMoveTask = useCallback(async (taskId, newColumn) => {
    const snapshot = dataRef.current.tasks[taskId];
    if (!snapshot) return { error: 'Task not found' };

    setData(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: {
          ...prev.tasks[taskId],
          column: newColumn,
          ...(newColumn === 'completed' ? { completedAt: Date.now() } : {})
        }
      },
      history: [{
        id: tempId(),
        action: newColumn === 'completed' ? 'completed' : 'moved',
        taskId, timestamp: Date.now(),
        message: `${newColumn === 'completed' ? 'Completed' : 'Moved'}: "${snapshot.title}"`
      }, ...prev.history].slice(0, 50)
    }));

    const result = await moveTask(taskId, newColumn);

    if (!result.success) {
      setData(prev => ({ ...prev, tasks: { ...prev.tasks, [taskId]: snapshot } }));
    }
    return result;
  }, []); // stable — uses dataRef

  const handleUpdateTask = useCallback(async (taskId, updates) => {
    const snapshot = dataRef.current.tasks[taskId];
    if (!snapshot) return { error: 'Task not found' };

    setData(prev => ({
      ...prev,
      tasks: { ...prev.tasks, [taskId]: { ...prev.tasks[taskId], ...updates } }
    }));

    const result = await updateTask(taskId, updates);

    if (!result.success) {
      setData(prev => ({ ...prev, tasks: { ...prev.tasks, [taskId]: snapshot } }));
    }
    return result;
  }, []); // stable — uses dataRef

  const handleUpdateSubtasks = useCallback(async (taskId, subtasks) => {
    return handleUpdateTask(taskId, { subtasks });
  }, [handleUpdateTask]);

  const handleDeleteTask = useCallback(async (taskId) => {
    const snapshot = dataRef.current.tasks[taskId];
    if (!snapshot) return { error: 'Task not found' };

    setData(prev => {
      const { [taskId]: _, ...rest } = prev.tasks;
      return {
        ...prev,
        tasks: rest,
        history: [{
          id: tempId(), action: 'deleted', taskId,
          timestamp: Date.now(), message: `Deleted: "${snapshot.title}"`
        }, ...prev.history].slice(0, 50)
      };
    });

    const result = await deleteTask(taskId);

    if (!result.success) {
      setData(prev => ({ ...prev, tasks: { ...prev.tasks, [taskId]: snapshot } }));
    }
    return result;
  }, []); // stable — uses dataRef

  const getTasksByColumn = useCallback((columnId, searchQuery = '') => {
    const query = searchQuery.toLowerCase();
    return Object.values(data.tasks || {})
      .filter(task => {
        const matchesColumn = task.column === columnId;
        if (!query) return matchesColumn;
        const matchesSearch =
          task.title.toLowerCase().includes(query) ||
          (task.description || '').toLowerCase().includes(query) ||
          (task.tags || []).some(tag => tag.toLowerCase().includes(query));
        return matchesColumn && matchesSearch;
      })
      .sort((a, b) => {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      });
  }, [data.tasks]);

  const getArchivedTasks = useCallback((searchQuery = '') => {
    const query = searchQuery.toLowerCase();
    return Object.values(data.tasks || {})
      .filter(task => {
        const isCompleted = task.column === 'completed';
        if (!query) return isCompleted;
        const matchesSearch =
          task.title.toLowerCase().includes(query) ||
          (task.description || '').toLowerCase().includes(query);
        return isCompleted && matchesSearch;
      })
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }, [data.tasks]);

  const getCurrentlyWorking = useCallback(() => {
    return Object.values(data.tasks || {})
      .filter(task => task.column === 'inProgress' && task.isAITask);
  }, [data.tasks]);

  const resetBoard = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return {
    tasks: data.tasks || {},
    history: data.history || [],
    loading,
    connected,
    lastSync,
    addTask,
    moveTask: handleMoveTask,
    updateTask: handleUpdateTask,
    updateSubtasks: handleUpdateSubtasks,
    deleteTask: handleDeleteTask,
    getTasksByColumn,
    getArchivedTasks,
    getCurrentlyWorking,
    resetBoard,
    refresh
  };
};
