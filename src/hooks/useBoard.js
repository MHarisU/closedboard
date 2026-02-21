import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  API_BASE, getAuthToken, fetchTasks, createTask, updateTask,
  deleteTask, moveTask, checkAPIHealth, startTimer as apiStartTimer,
  stopTimer as apiStopTimer, fetchBoards, createBoard as apiCreateBoard,
  updateBoard as apiUpdateBoard, deleteBoard as apiDeleteBoard,
  fetchCustomTags, createCustomTag, updateCustomTag, deleteCustomTag
} from '../utils/api';
import { enqueue, getPendingCount, replayQueue } from '../utils/syncQueue';
import { DEFAULT_TAGS } from '../utils/constants';

const BOARD_KEY = 'closedboard_current_board';

export const useBoard = (onTaskUnblocked) => {
  const [data, setData] = useState({ tasks: {}, history: [], meta: {} });
  const unblockedCbRef = useRef(onTaskUnblocked);
  useEffect(() => { unblockedCbRef.current = onTaskUnblocked; }, [onTaskUnblocked]);
  const [boards, setBoards] = useState([]);
  const [customTags, setCustomTags] = useState(DEFAULT_TAGS);
  const [currentBoardId, setCurrentBoardIdRaw] = useState(
    () => localStorage.getItem(BOARD_KEY) || 'default'
  );
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [pendingSync, setPendingSync] = useState(0);

  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);
  const boardIdRef = useRef(currentBoardId);

  const setCurrentBoardId = useCallback((id) => {
    setCurrentBoardIdRaw(id);
    boardIdRef.current = id;
    localStorage.setItem(BOARD_KEY, id);
  }, []);

  const refresh = useCallback(async (boardId) => {
    const bid = boardId || boardIdRef.current;
    try {
      const result = await fetchTasks(bid);
      setData(result);
      setLastSync(Date.now());
    } catch (e) { console.warn('Refresh failed', e); }
  }, []);

  const loadBoards = useCallback(async () => {
    const result = await fetchBoards();
    setBoards(result.boards || []);
  }, []);

  const loadTags = useCallback(async () => {
    const result = await fetchCustomTags();
    if (result.tags && Object.keys(result.tags).length > 0) {
      setCustomTags(result.tags);
    }
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      const isUp = await checkAPIHealth();
      setConnected(isUp);
      await Promise.all([
        refresh(currentBoardId),
        loadBoards(),
        loadTags()
      ]);
      setPendingSync(getPendingCount());
      setLoading(false);
    })();
  }, []);

  // Reload tasks when board changes (skip initial mount — already loaded above)
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (!hasInitialized.current) { hasInitialized.current = true; return; }
    refresh(currentBoardId);
  }, [currentBoardId]);

  // SSE
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    const url = `${API_BASE}/events?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);

    source.addEventListener('connected', async () => {
      setConnected(true);
      const pending = getPendingCount();
      if (pending > 0) {
        const result = await replayQueue({ create: createTask, update: updateTask, delete: deleteTask, move: moveTask });
        setPendingSync(result.remaining);
        if (result.replayed > 0) { await refresh(); return; }
      }
      try { await refresh(); } catch {}
    });

    const updateIfCurrentBoard = (task) => {
      if (task.boardId && task.boardId !== boardIdRef.current) return;
      setData(prev => ({ ...prev, tasks: { ...prev.tasks, [task.id]: task } }));
      setLastSync(Date.now());
    };

    source.addEventListener('task_created', (e) => updateIfCurrentBoard(JSON.parse(e.data).task));
    source.addEventListener('task_updated', (e) => updateIfCurrentBoard(JSON.parse(e.data).task));
    source.addEventListener('task_moved', (e) => updateIfCurrentBoard(JSON.parse(e.data).task));

    source.addEventListener('task_deleted', (e) => {
      const { taskId, boardId } = JSON.parse(e.data);
      if (boardId && boardId !== boardIdRef.current) return;
      setData(prev => { const { [taskId]: _, ...rest } = prev.tasks; return { ...prev, tasks: rest }; });
      setLastSync(Date.now());
    });

    source.addEventListener('board_created', (e) => { const { board } = JSON.parse(e.data); setBoards(prev => [...prev, board]); });
    source.addEventListener('board_updated', (e) => { const { board } = JSON.parse(e.data); setBoards(prev => prev.map(b => b.id === board.id ? board : b)); });
    source.addEventListener('board_deleted', (e) => {
      const { boardId } = JSON.parse(e.data);
      setBoards(prev => prev.filter(b => b.id !== boardId));
      if (boardId === boardIdRef.current) {
        setCurrentBoardIdRaw('default');
        boardIdRef.current = 'default';
        localStorage.setItem(BOARD_KEY, 'default');
        refresh('default');
      }
    });

    source.addEventListener('tag_created', (e) => { const { tag } = JSON.parse(e.data); setCustomTags(prev => ({ ...prev, [tag.id]: tag })); });
    source.addEventListener('tag_updated', (e) => { const { tag } = JSON.parse(e.data); setCustomTags(prev => ({ ...prev, [tag.id]: tag })); });
    source.addEventListener('tag_deleted', (e) => { const { tagId } = JSON.parse(e.data); setCustomTags(prev => { const n = { ...prev }; delete n[tagId]; return n; }); });

    source.addEventListener('task_unblocked', (e) => {
      const { title, unblockedBy } = JSON.parse(e.data);
      unblockedCbRef.current?.({ title, unblockedBy });
    });

    source.onerror = () => setConnected(false);
    return () => source.close();
  }, []);

  const tempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  // ---------- Task operations ----------

  const addTask = useCallback(async (task) => {
    const optId = tempId();
    const optTask = {
      id: optId, ...task, createdAt: Date.now(), boardId: boardIdRef.current,
      isAITask: task.isAITask || false, tags: task.tags || [], subtasks: task.subtasks || [],
      timeEntries: task.timeEntries || [], dueDate: task.dueDate || null,
      blockedBy: task.blockedBy || []
    };
    setData(prev => ({
      ...prev, tasks: { ...prev.tasks, [optId]: optTask },
      history: [{ id: tempId(), action: 'created', taskId: optId, timestamp: Date.now(), message: `Created: "${task.title}"` }, ...prev.history].slice(0, 50)
    }));
    const result = await createTask({ ...task, boardId: boardIdRef.current });
    if (result.success) {
      setData(prev => { const { [optId]: _, ...rest } = prev.tasks; return { ...prev, tasks: { ...rest, [result.task.id]: result.task } }; });
    } else if (result.offline) { enqueue({ type: 'create', data: { ...task, boardId: boardIdRef.current } }); setPendingSync(getPendingCount()); }
    else { setData(prev => { const { [optId]: _, ...rest } = prev.tasks; return { ...prev, tasks: rest }; }); }
    return result;
  }, []);

  const handleMoveTask = useCallback(async (taskId, newColumn) => {
    const snapshot = dataRef.current.tasks[taskId];
    if (!snapshot) return { error: 'Task not found' };
    setData(prev => ({
      ...prev, tasks: { ...prev.tasks, [taskId]: { ...prev.tasks[taskId], column: newColumn, ...(newColumn === 'completed' ? { completedAt: Date.now() } : {}) } },
      history: [{ id: tempId(), action: newColumn === 'completed' ? 'completed' : 'moved', taskId, timestamp: Date.now(),
        message: `${newColumn === 'completed' ? 'Completed' : 'Moved'}: "${snapshot.title}"` }, ...prev.history].slice(0, 50)
    }));
    const result = await moveTask(taskId, newColumn);
    if (result.offline) { enqueue({ type: 'move', taskId, data: { column: newColumn } }); setPendingSync(getPendingCount()); }
    else if (!result.success) { setData(prev => ({ ...prev, tasks: { ...prev.tasks, [taskId]: snapshot } })); }
    return result;
  }, []);

  const handleUpdateTask = useCallback(async (taskId, updates) => {
    const snapshot = dataRef.current.tasks[taskId];
    if (!snapshot) return { error: 'Task not found' };
    setData(prev => ({ ...prev, tasks: { ...prev.tasks, [taskId]: { ...prev.tasks[taskId], ...updates } } }));
    const result = await updateTask(taskId, updates);
    if (result.offline) { enqueue({ type: 'update', taskId, data: updates }); setPendingSync(getPendingCount()); }
    else if (!result.success) { setData(prev => ({ ...prev, tasks: { ...prev.tasks, [taskId]: snapshot } })); }
    return result;
  }, []);

  const handleUpdateSubtasks = useCallback(async (taskId, subtasks) => handleUpdateTask(taskId, { subtasks }), [handleUpdateTask]);

  const handleDeleteTask = useCallback(async (taskId) => {
    const snapshot = dataRef.current.tasks[taskId];
    if (!snapshot) return { error: 'Task not found' };
    setData(prev => { const { [taskId]: _, ...rest } = prev.tasks; return { ...prev, tasks: rest,
      history: [{ id: tempId(), action: 'deleted', taskId, timestamp: Date.now(), message: `Deleted: "${snapshot.title}"` }, ...prev.history].slice(0, 50) }; });
    const result = await deleteTask(taskId);
    if (result.offline) { enqueue({ type: 'delete', taskId }); setPendingSync(getPendingCount()); }
    else if (!result.success) { setData(prev => ({ ...prev, tasks: { ...prev.tasks, [taskId]: snapshot } })); }
    return result;
  }, []);

  // ---------- Timer ----------

  const handleStartTimer = useCallback(async (taskId) => {
    const result = await apiStartTimer(taskId);
    if (result.success && result.task) {
      setData(prev => ({ ...prev, tasks: { ...prev.tasks, [taskId]: result.task } }));
    }
    return result;
  }, []);

  const handleStopTimer = useCallback(async (taskId) => {
    const result = await apiStopTimer(taskId);
    if (result.success && result.task) {
      setData(prev => ({ ...prev, tasks: { ...prev.tasks, [taskId]: result.task } }));
    }
    return result;
  }, []);

  const activeTimerTaskId = useMemo(() => {
    for (const task of Object.values(data.tasks || {})) {
      const entries = task.timeEntries || [];
      const last = entries[entries.length - 1];
      if (last && !last.end) return task.id;
    }
    return null;
  }, [data.tasks]);

  // ---------- Board operations ----------

  const handleCreateBoard = useCallback(async (board) => {
    const result = await apiCreateBoard(board);
    if (result.success) setBoards(prev => [...prev, result.board]);
    return result;
  }, []);

  const handleUpdateBoard = useCallback(async (id, updates) => {
    const result = await apiUpdateBoard(id, updates);
    if (result.success) setBoards(prev => prev.map(b => b.id === id ? result.board : b));
    return result;
  }, []);

  const handleDeleteBoard = useCallback(async (id) => {
    const result = await apiDeleteBoard(id);
    if (result.success) {
      setBoards(prev => prev.filter(b => b.id !== id));
      if (boardIdRef.current === id) { setCurrentBoardId('default'); }
    }
    return result;
  }, [setCurrentBoardId]);

  // ---------- Tag operations ----------

  const handleCreateTag = useCallback(async (tag) => {
    const result = await createCustomTag(tag);
    if (result.success) setCustomTags(prev => ({ ...prev, [result.tag.id]: result.tag }));
    return result;
  }, []);

  const handleUpdateTag = useCallback(async (id, updates) => {
    const result = await updateCustomTag(id, updates);
    if (result.success) setCustomTags(prev => ({ ...prev, [id]: result.tag }));
    return result;
  }, []);

  const handleDeleteTag = useCallback(async (id) => {
    const result = await deleteCustomTag(id);
    if (result.success) { setCustomTags(prev => { const n = { ...prev }; delete n[id]; return n; }); await refresh(); }
    return result;
  }, [refresh]);

  // ---------- Queries ----------

  const getTasksByColumn = useCallback((columnId, searchQuery = '') => {
    const q = searchQuery.toLowerCase();
    const now = Date.now();
    return Object.values(data.tasks || {})
      .filter(task => {
        if (task.column !== columnId) return false;
        if (!q) return true;
        return task.title.toLowerCase().includes(q) ||
          (task.description || '').toLowerCase().includes(q) ||
          (task.tags || []).some(tag => tag.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const aOv = a.dueDate && a.dueDate < now ? 1 : 0;
        const bOv = b.dueDate && b.dueDate < now ? 1 : 0;
        if (aOv !== bOv) return bOv - aOv;
        const o = { urgent: 0, high: 1, medium: 2, low: 3 };
        if (o[a.priority] !== o[b.priority]) return o[a.priority] - o[b.priority];
        if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
  }, [data.tasks]);

  const getArchivedTasks = useCallback((searchQuery = '') => {
    const q = searchQuery.toLowerCase();
    return Object.values(data.tasks || {})
      .filter(task => {
        if (task.column !== 'completed') return false;
        if (!q) return true;
        return task.title.toLowerCase().includes(q) || (task.description || '').toLowerCase().includes(q);
      })
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  }, [data.tasks]);

  const getCurrentlyWorking = useCallback(() =>
    Object.values(data.tasks || {}).filter(task => task.column === 'inProgress' && task.isAITask),
  [data.tasks]);

  return {
    tasks: data.tasks || {}, history: data.history || [],
    loading, connected, lastSync, pendingSync,
    boards, currentBoardId, setCurrentBoardId,
    customTags, activeTimerTaskId,
    addTask, moveTask: handleMoveTask, updateTask: handleUpdateTask,
    updateSubtasks: handleUpdateSubtasks, deleteTask: handleDeleteTask,
    startTimer: handleStartTimer, stopTimer: handleStopTimer,
    createBoard: handleCreateBoard, updateBoard: handleUpdateBoard, deleteBoard: handleDeleteBoard,
    createTag: handleCreateTag, updateTag: handleUpdateTag, deleteTag: handleDeleteTag,
    getTasksByColumn, getArchivedTasks, getCurrentlyWorking, refresh
  };
};
