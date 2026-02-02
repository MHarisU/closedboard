import { useState, useEffect, useCallback } from 'react';
import { fetchTasks, createTask, updateTask, deleteTask, moveTask, checkAPIHealth } from '../utils/api';

export const useBoard = () => {
  const [data, setData] = useState({ tasks: {}, history: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const isConnected = await checkAPIHealth();
      setConnected(isConnected);
      const result = await fetchTasks();
      setData(result);
      setLoading(false);
    };
    init();
  }, []);

  // Refresh data from API
  const refresh = useCallback(async () => {
    const result = await fetchTasks();
    setData(result);
  }, []);

  // Add a new task
  const addTask = useCallback(async (task) => {
    const result = await createTask(task);
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh]);

  // Move task to different column
  const handleMoveTask = useCallback(async (taskId, newColumn) => {
    const result = await moveTask(taskId, newColumn);
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh]);

  // Update task
  const handleUpdateTask = useCallback(async (taskId, updates) => {
    const result = await updateTask(taskId, updates);
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh]);

  // Delete task
  const handleDeleteTask = useCallback(async (taskId) => {
    const result = await deleteTask(taskId);
    if (result.success) {
      await refresh();
    }
    return result;
  }, [refresh]);

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
    // For API mode, this would need a reset endpoint
    // For now, just refresh
    await refresh();
  }, [refresh]);

  return {
    tasks: data.tasks || {},
    history: data.history || [],
    loading,
    connected,
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
