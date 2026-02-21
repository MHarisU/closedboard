import { useState, useRef, useCallback, useEffect } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { useBoard } from './hooks/useBoard';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import {
  Shield, AlertTriangle, Search, Tag, Heart, Rocket, Keyboard
} from 'lucide-react';
import Header from './components/Header';
import Column from './components/Column';
import CurrentlyWorking from './components/CurrentlyWorking';
import StatsPanel from './components/StatsPanel';
import ActivityFeed from './components/ActivityFeed';
import TaskModal from './components/TaskModal';
import TagManager from './components/TagManager';
import ToastContainer from './components/ToastContainer';
import LearningDashboard from './components/LearningDashboard';
import MorningBriefing, { shouldShowBriefing, dismissBriefing } from './components/MorningBriefing';
import FocusMode from './components/FocusMode';
import QuickCapture from './components/QuickCapture';
import DependencyGraph from './components/DependencyGraph';
import { COLUMNS, isTaskBlocked } from './utils/constants';

function SkeletonCard({ isDark }) {
  const bg = isDark ? 'bg-slate-700' : 'bg-slate-200';
  const bgFaint = isDark ? 'bg-slate-700/50' : 'bg-slate-100';
  return (
    <div className={`rounded-xl p-4 border mb-3 ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200'}`}>
      <div className={`h-3.5 w-3/4 rounded animate-pulse mb-3 ${bg}`} />
      <div className={`h-2.5 w-full rounded animate-pulse mb-2 ${bgFaint}`} />
      <div className={`h-2.5 w-2/3 rounded animate-pulse mb-3 ${bgFaint}`} />
      <div className={`h-6 w-1/3 rounded-full animate-pulse ${bgFaint}`} />
    </div>
  );
}

function SkeletonBoard({ isDark }) {
  const colBg = isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-slate-200';
  const barBg = isDark ? 'bg-slate-800' : 'bg-slate-200';
  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className={`border-b ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className={`h-7 w-36 rounded-lg animate-pulse ${barBg}`} />
          <div className="flex gap-2">
            <div className={`h-8 w-24 rounded-lg animate-pulse ${barBg}`} />
            <div className={`h-8 w-8 rounded-lg animate-pulse ${barBg}`} />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className={`h-20 rounded-2xl animate-pulse mb-6 ${isDark ? 'bg-slate-900/50' : 'bg-white/50'}`} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className={`rounded-2xl border ${colBg}`}>
              <div className="p-4 flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg animate-pulse ${barBg}`} />
                <div className={`h-4 w-20 rounded animate-pulse ${barBg}`} />
              </div>
              <div className="p-3">
                <SkeletonCard isDark={isDark} />
                {i < 2 && <SkeletonCard isDark={isDark} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyBoard({ isDark, onNewTask }) {
  return (
    <div className="mb-6">
      <div className={`text-center py-16 px-6 rounded-2xl border-2 border-dashed
        ${isDark ? 'border-slate-700 bg-slate-900/30' : 'border-slate-300 bg-white/50'}`}>
        <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
          style={{ animation: 'bounce 2s ease-in-out infinite' }}>
          <Rocket size={40} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
        </div>
        <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Your board is empty</h2>
        <p className={`text-sm mb-6 max-w-sm mx-auto leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Start organizing your work. Create your first task with the
          <kbd className={`mx-1 px-1.5 py-0.5 rounded text-xs font-mono font-bold ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>+</kbd>
          button or press
          <kbd className={`mx-1 px-1.5 py-0.5 rounded text-xs font-mono font-bold ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>N</kbd>
        </p>
        <button onClick={onNewTask}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-sm">
          Create First Task
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const toast = useToast();

  const handleUnblocked = useCallback(({ title, unblockedBy }) => {
    toast.success(`Unblocked: ${title} (${unblockedBy} completed)`);
  }, [toast]);

  const {
    tasks, history, loading, connected, lastSync, pendingSync,
    boards, currentBoardId, setCurrentBoardId, customTags, activeTimerTaskId,
    addTask, moveTask, updateTask, updateSubtasks, deleteTask,
    startTimer, stopTimer,
    createBoard, updateBoard, deleteBoard,
    createTag, updateTag, deleteTag,
    getTasksByColumn, getArchivedTasks, getCurrentlyWorking, refresh
  } = useBoard(handleUnblocked);

  const { isDark } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [tagFilter, setTagFilter] = useState(null);
  const [focusedTaskId, setFocusedTaskId] = useState(null);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [showBriefing, setShowBriefing] = useState(() => shouldShowBriefing());
  const [focusMode, setFocusMode] = useState(false);
  const [depsOpen, setDepsOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (focusMode && !Object.values(tasks).some(t => t.column === 'inProgress')) {
      setFocusMode(false);
    }
  }, [focusMode, tasks]);

  const handleNewTask = useCallback(() => { setEditingTask(null); setIsModalOpen(true); }, []);
  const handleEditTask = useCallback((task) => { setEditingTask(task); setIsModalOpen(true); }, []);

  const handleSaveTask = async (taskData) => {
    if (taskData.id) { await updateTask(taskData.id, taskData); toast.success('Task updated!'); }
    else { await addTask(taskData); toast.success('Task created!'); }
  };

  const handleMoveTask = async (taskId, column) => {
    const task = tasks[taskId];
    if (column === 'inProgress' && task && isTaskBlocked(task, tasks)) {
      toast.error('This task is blocked. Complete its blockers first.');
      return;
    }
    await moveTask(taskId, column);
    if (column === 'completed') toast.success(`Completed: ${task?.title || 'Task'}`);
    else if (column === 'inProgress') toast.info(`Started: ${task?.title || 'Task'}`);
  };

  const handleDeleteTask = useCallback(async (taskId) => {
    const task = tasks[taskId];
    if (!task) return;
    await deleteTask(taskId);
    toast.success(`Deleted: ${task.title}`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: async () => {
          await addTask({
            title: task.title, description: task.description,
            column: task.column, priority: task.priority,
            isAITask: task.isAITask, tags: task.tags,
            subtasks: task.subtasks, resources: task.resources,
            dueDate: task.dueDate, timeEntries: task.timeEntries,
            blockedBy: task.blockedBy
          });
          toast.info('Task restored');
        }
      }
    });
  }, [tasks, deleteTask, addTask, toast]);

  const handleStartTimer = async (taskId) => {
    if (activeTimerTaskId && activeTimerTaskId !== taskId) {
      await stopTimer(activeTimerTaskId);
    }
    const result = await startTimer(taskId);
    if (!focusMode) {
      if (result.success) toast.info('Timer started');
      else if (result.error) toast.error(result.error);
    }
    return result;
  };

  const handleStopTimer = async (taskId) => {
    const result = await stopTimer(taskId);
    if (!focusMode && result.success) toast.info('Timer stopped');
    return result;
  };

  const enterFocusMode = useCallback(() => {
    const inProgress = Object.values(tasks)
      .filter(t => t.column === 'inProgress')
      .sort((a, b) => {
        const o = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (o[a.priority] ?? 2) - (o[b.priority] ?? 2);
      });
    if (inProgress.length > 0) setFocusMode(true);
    else toast.info('No in-progress tasks to focus on');
  }, [tasks, toast]);

  const focusTask = focusMode ? Object.values(tasks)
    .filter(t => t.column === 'inProgress')
    .sort((a, b) => {
      const o = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (o[a.priority] ?? 2) - (o[b.priority] ?? 2);
    })[0] || null : null;

  const handleQuickCapture = useCallback(async (taskData) => {
    await addTask(taskData);
    toast.success('Captured!');
  }, [addTask, toast]);

  const handleTagFilter = (tagId) => {
    if (tagFilter === tagId) setTagFilter(null);
    else { setTagFilter(tagId); toast.info(`Filtering by: ${customTags[tagId]?.label || tagId}`); }
  };
  const clearTagFilter = () => setTagFilter(null);
  const focusSearch = useCallback(() => { searchInputRef.current?.focus(); }, []);
  const closeModal = useCallback(() => { setIsModalOpen(false); }, []);

  const filterTasksByTag = (taskList) => {
    if (!tagFilter) return taskList;
    return taskList.filter(task => task.tags?.includes(tagFilter));
  };

  const archivedTasks = filterTasksByTag(getArchivedTasks(searchQuery));
  const totalTasks = Object.keys(tasks).length;

  const allVisibleTaskIds = showArchive
    ? archivedTasks.map(t => t.id)
    : Object.keys(COLUMNS).flatMap(colId =>
        filterTasksByTag(getTasksByColumn(colId, searchQuery)).map(t => t.id));

  useKeyboardShortcuts({
    onNewTask: handleNewTask, onRefresh: refresh,
    onSearch: focusSearch, onCloseModal: closeModal, isModalOpen,
    focusedTaskId, allVisibleTaskIds,
    onFocusTask: setFocusedTaskId,
    onEditFocused: () => { const t = focusedTaskId && tasks[focusedTaskId]; if (t) handleEditTask(t); },
    onDeleteFocused: () => { if (focusedTaskId) handleDeleteTask(focusedTaskId); },
    disabled: showBriefing || focusMode
  });

  const currentlyWorking = getCurrentlyWorking();

  if (loading) return <SkeletonBoard isDark={isDark} />;

  if (showBriefing && Object.keys(tasks).length > 0) {
    return (
      <MorningBriefing
        tasks={tasks}
        customTags={customTags}
        history={history}
        onDismiss={() => { dismissBriefing(); setShowBriefing(false); }}
      />
    );
  }

  if (focusMode && focusTask) {
    return (
      <FocusMode
        task={focusTask}
        onExit={() => setFocusMode(false)}
        onStartTimer={handleStartTimer}
        onStopTimer={handleStopTimer}
        activeTimerTaskId={activeTimerTaskId}
      />
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <Header
        onNewTask={handleNewTask} onRefresh={refresh}
        connected={connected} lastSync={lastSync}
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        showArchive={showArchive} onToggleArchive={() => setShowArchive(!showArchive)}
        showStats={showStats} onToggleStats={() => setShowStats(!showStats)}
        searchInputRef={searchInputRef}
        boards={boards} currentBoardId={currentBoardId}
        onSwitchBoard={setCurrentBoardId}
        onCreateBoard={createBoard} onUpdateBoard={updateBoard} onDeleteBoard={deleteBoard}
        onOpenTagManager={() => setTagManagerOpen(true)}
        onFocusMode={enterFocusMode}
        onOpenDeps={() => setDepsOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!connected && (
          <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm
            ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
            <AlertTriangle size={15} />
            <span>Demo mode - API not connected</span>
          </div>
        )}

        {searchQuery && (
          <div className={`mb-4 p-3 rounded-xl flex items-center justify-between text-sm
            ${isDark ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
            <span className="flex items-center gap-2"><Search size={14} /> Searching for &ldquo;{searchQuery}&rdquo;</span>
            <button onClick={() => setSearchQuery('')} className="hover:underline font-medium">Clear</button>
          </div>
        )}

        {tagFilter && (
          <div className={`mb-4 p-3 rounded-xl flex items-center justify-between text-sm
            ${isDark ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400' : 'bg-violet-50 border border-violet-200 text-violet-700'}`}>
            <span className="flex items-center gap-2">
              <Tag size={14} /> Filtering by tag:
              <span className={`px-2 py-0.5 rounded-full text-white text-xs ${customTags[tagFilter]?.color || 'bg-slate-500'}`}>
                {customTags[tagFilter]?.label || tagFilter}
              </span>
            </span>
            <button onClick={clearTagFilter} className="hover:underline font-medium">Clear filter</button>
          </div>
        )}

        {showStats && <StatsPanel tasks={tasks} />}
        <LearningDashboard tasks={tasks} onTagFilter={handleTagFilter} customTags={customTags} />
        <CurrentlyWorking tasks={currentlyWorking} />

        {totalTasks === 0 && !searchQuery && !tagFilter && !showArchive && (
          <EmptyBoard isDark={isDark} onNewTask={handleNewTask} />
        )}

        {showArchive ? (
          <div className="mb-6">
            <Column columnId="completed" tasks={archivedTasks}
              onMoveTask={handleMoveTask} onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask} onUpdateSubtask={updateSubtasks}
              onTagFilter={handleTagFilter} activeTagFilter={tagFilter}
              isArchive={true} focusedTaskId={focusedTaskId}
              customTags={customTags}
              onStartTimer={handleStartTimer} onStopTimer={handleStopTimer}
              activeTimerTaskId={activeTimerTaskId} allTasks={tasks}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.keys(COLUMNS).map(columnId => (
              <Column key={columnId} columnId={columnId}
                tasks={filterTasksByTag(getTasksByColumn(columnId, searchQuery))}
                onMoveTask={handleMoveTask} onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask} onUpdateSubtask={updateSubtasks}
                onTagFilter={handleTagFilter} activeTagFilter={tagFilter}
                focusedTaskId={focusedTaskId}
                customTags={customTags}
                onStartTimer={handleStartTimer} onStopTimer={handleStopTimer}
                activeTimerTaskId={activeTimerTaskId} allTasks={tasks}
              />
            ))}
          </div>
        )}

        <ActivityFeed history={history} />

        <footer className={`text-center py-8 text-sm transition-colors duration-300 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          <p className="flex items-center justify-center gap-2">
            Built with <Heart size={14} className="text-red-500" /> by ClosedBot
            <Shield size={14} /> for Rohail
          </p>
          <p className="text-xs mt-2 flex items-center justify-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {connected ? 'Live (SSE)' : 'Offline mode'}
            {pendingSync > 0 && <span className="text-amber-400">&middot; {pendingSync} queued</span>}
            {showArchive && <span>&middot; Archive</span>}
          </p>
          <p className={`text-[10px] mt-3 flex items-center justify-center gap-1 ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>
            <Keyboard size={11} /> N: New &middot; j/k: Navigate &middot; Enter: Edit &middot; D: Delete &middot; /: Search &middot; R: Refresh
          </p>
        </footer>
        <div className="h-16" />
      </main>

      <TaskModal isOpen={isModalOpen} onClose={closeModal} onSave={handleSaveTask}
        editTask={editingTask} customTags={customTags} allTasks={tasks} />
      <TagManager isOpen={tagManagerOpen} onClose={() => setTagManagerOpen(false)}
        tags={customTags} onCreate={createTag} onUpdate={updateTag} onDelete={deleteTag} />
      <DependencyGraph isOpen={depsOpen} onClose={() => setDepsOpen(false)} tasks={tasks} />
      <QuickCapture onCapture={handleQuickCapture} />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}
