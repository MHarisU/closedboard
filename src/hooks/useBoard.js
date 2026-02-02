import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchTasks, createTask, updateTask, deleteTask, moveTask, checkAPIHealth } from '../utils/api';

export const useBoard = () => {
  const [data, setData] = useState({ tasks: {}, history: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const refreshInterval = useRef(null);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const isConnected = await checkAPIHealth();
      setConnected(isConnected);
      const result = await fetchTasks();
      setData(result);
      setLastSync(Date.now());
      setLoading(false);
    };
    init();
  }, []);

  // Auto-refresh every 30 seconds
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
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  // Refresh data from API
  const refresh = useCallback(async () => {
    const result = await fetchTasks();
    setData(result);
    setLastSync(Date.now());
  }, []);

  // Generate temp ID for optimistic updates
  const tempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // Add a new task (optimistic)
  const addTask = useCallback(async (task) => {
    const optimisticId = tempId();
    const optimisticTask = {
      id: optimisticId,
      ...task,
      createdAt: Date.now(),
      isAITask: task.isAITask || false
    };

    // Optimistic update
    setData(prev => ({
      ...prev,
      tasks: { ...prev.tasks, [optimisticId]: optimisticTask },
      history: [{
        id: tempId(),
        action: 'created',
        taskId: optimisticId,
        timestamp: Date.now(),
        message: `Created: "${task.title}"`
      }, ...prev.history].slice(0, 50)
    }));

    // Actual API call
    const result = await createTask(task);
    
    // Sync with server response
    if (result.success) {
      await refresh();
    } else {
      // Rollback on failure
      setData(prev => {
        const { [optimisticId]: removed, ...rest } = prev.tasks;
        return { ...prev, tasks: rest };
      });
    }
    return result;
  }, [refresh]);

  // Move task to different column (optimistic)
  const handleMoveTask = useCallback(async (taskId, newColumn) => {
    // Store previous state for rollback
    const previousTask = data.tasks[taskId];
    if (!previousTask) return { error: 'Task not found' };

    // Optimistic update
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
        taskId,
        timestamp: Date.now(),
        message: `${newColumn === 'completed' ? 'Completed' : 'Moved'}: "${previousTask.title}"`
      }, ...prev.history].slice(0, 50)
    }));

    // Actual API call
    const result = await moveTask(taskId, newColumn);
    
    if (!result.success) {
      // Rollback on failure
      setData(prev => ({
        ...prev,
        tasks: { ...prev.tasks, [taskId]: previousTask }
      }));
    }
    return result;
  }, [data.tasks]);

  // Update task (optimistic)
  const handleUpdateTask = useCallback(async (taskId, updates) => {
    const previousTask = data.tasks[taskId];
    if (!previousTask) return { error: 'Task not found' };

    // Optimistic update
    setData(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: { ...prev.tasks[taskId], ...updates }
      }
    }));

    // Actual API call
    const result = await updateTask(taskId, updates);
    
    if (!result.success) {
      // Rollback on failure
      setData(prev => ({
        ...prev,
        tasks: { ...prev.tasks, [taskId]: previousTask }
      }));
    }
    return result;
  }, [data.tasks]);

  // Delete task (optimistic)
  const handleDeleteTask = useCallback(async (taskId) => {
    const previousTask = data.tasks[taskId];
    if (!previousTask) return { error: 'Task not found' };

    // Optimistic update
    setData(prev => {
      const { [taskId]: removed, ...rest } = prev.tasks;
      return {
        ...prev,
        tasks: rest,
        history: [{
          id: tempId(),
          action: 'deleted',
          taskId,
          timestamp: Date.now(),
          message: `Deleted: "${previousTask.title}"`
        }, ...prev.history].slice(0, 50)
      };
    });

    // Actual API call
    const result = await deleteTask(taskId);
    
    if (!result.success) {
      // Rollback on failure
      setData(prev => ({
        ...prev,
        tasks: { ...prev.tasks, [taskId]: previousTask }
      }));
    }
    return result;
  }, [data.tasks]);

  // Get tasks by column
  const getTasksByColumn = useCallback((columnId) => {
    return Object.values(data.tasks || {})
      .filter(task => task.column === columnId)
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }, [data.tasks]);

  // Get currently working tasks (AI tasks in progress)
  const getCurrentlyWorking = useCallback(() => {
    return Object.values(data.tasks || {})
      .filter(task => task.column === 'inProgress' && task.isAITask);
  }, [data.tasks]);

  // Reset board
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
    deleteTask: handleDeleteTask,
    getTasksByColumn,
    getCurrentlyWorking,
    resetBoard,
    refresh
  };
};
