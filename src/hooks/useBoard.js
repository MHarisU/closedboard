import { useState, useEffect, useCallback } from 'react';
import { generateId, saveToStorage, loadFromStorage, getInitialData } from '../utils/constants';

export const useBoard = () => {
  const [data, setData] = useState(() => {
    const stored = loadFromStorage();
    return stored || getInitialData();
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  // Add a new task
  const addTask = useCallback((task) => {
    const id = generateId();
    const newTask = {
      id,
      title: task.title,
      description: task.description || '',
      column: task.column || 'backlog',
      priority: task.priority || 'medium',
      createdAt: Date.now(),
      isAITask: task.isAITask || false
    };

    const historyEntry = {
      id: generateId(),
      action: 'created',
      taskId: id,
      timestamp: Date.now(),
      message: `Created task: "${task.title}"`
    };

    setData(prev => ({
      ...prev,
      tasks: { ...prev.tasks, [id]: newTask },
      history: [historyEntry, ...prev.history].slice(0, 50)
    }));

    return id;
  }, []);

  // Move task to different column
  const moveTask = useCallback((taskId, newColumn) => {
    setData(prev => {
      const task = prev.tasks[taskId];
      if (!task || task.column === newColumn) return prev;

      const updatedTask = {
        ...task,
        column: newColumn,
        ...(newColumn === 'completed' ? { completedAt: Date.now() } : {})
      };

      const actionMap = {
        backlog: 'moved to backlog',
        inProgress: 'started working on',
        completed: 'completed'
      };

      const historyEntry = {
        id: generateId(),
        action: newColumn === 'completed' ? 'completed' : 'moved',
        taskId,
        timestamp: Date.now(),
        message: `${actionMap[newColumn]}: "${task.title}"`
      };

      return {
        ...prev,
        tasks: { ...prev.tasks, [taskId]: updatedTask },
        history: [historyEntry, ...prev.history].slice(0, 50)
      };
    });
  }, []);

  // Update task
  const updateTask = useCallback((taskId, updates) => {
    setData(prev => {
      const task = prev.tasks[taskId];
      if (!task) return prev;

      const historyEntry = {
        id: generateId(),
        action: 'updated',
        taskId,
        timestamp: Date.now(),
        message: `Updated task: "${updates.title || task.title}"`
      };

      return {
        ...prev,
        tasks: { ...prev.tasks, [taskId]: { ...task, ...updates } },
        history: [historyEntry, ...prev.history].slice(0, 50)
      };
    });
  }, []);

  // Delete task
  const deleteTask = useCallback((taskId) => {
    setData(prev => {
      const task = prev.tasks[taskId];
      if (!task) return prev;

      const { [taskId]: removed, ...remainingTasks } = prev.tasks;

      const historyEntry = {
        id: generateId(),
        action: 'deleted',
        taskId,
        timestamp: Date.now(),
        message: `Deleted task: "${task.title}"`
      };

      return {
        ...prev,
        tasks: remainingTasks,
        history: [historyEntry, ...prev.history].slice(0, 50)
      };
    });
  }, []);

  // Get tasks by column
  const getTasksByColumn = useCallback((columnId) => {
    return Object.values(data.tasks)
      .filter(task => task.column === columnId)
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }, [data.tasks]);

  // Get currently working tasks (AI tasks in progress)
  const getCurrentlyWorking = useCallback(() => {
    return Object.values(data.tasks)
      .filter(task => task.column === 'inProgress' && task.isAITask);
  }, [data.tasks]);

  // Reset to initial data
  const resetBoard = useCallback(() => {
    const initial = getInitialData();
    setData(initial);
  }, []);

  return {
    tasks: data.tasks,
    history: data.history,
    addTask,
    moveTask,
    updateTask,
    deleteTask,
    getTasksByColumn,
    getCurrentlyWorking,
    resetBoard
  };
};
