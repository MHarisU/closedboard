import { useState, useRef, useCallback } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { useBoard } from './hooks/useBoard';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import Header from './components/Header';
import Column from './components/Column';
import CurrentlyWorking from './components/CurrentlyWorking';
import StatsPanel from './components/StatsPanel';
import ActivityFeed from './components/ActivityFeed';
import TaskModal from './components/TaskModal';
import ToastContainer from './components/ToastContainer';
import LearningDashboard from './components/LearningDashboard';
import { COLUMNS, TAGS } from './utils/constants';

function AppContent() {
  const {
    tasks,
    history,
    loading,
    connected,
    lastSync,
    addTask,
    moveTask,
    updateTask,
    updateSubtasks,
    deleteTask,
    getTasksByColumn,
    getArchivedTasks,
    getCurrentlyWorking,
    refresh
  } = useBoard();

  const { isDark } = useTheme();
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [tagFilter, setTagFilter] = useState(null);
  const searchInputRef = useRef(null);

  const handleNewTask = useCallback(() => {
    setEditingTask(null);
    setIsModalOpen(true);
  }, []);

  const handleEditTask = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData) => {
    if (taskData.id) {
      await updateTask(taskData.id, taskData);
      toast.success('Task updated!');
    } else {
      await addTask(taskData);
      toast.success('Task created!');
    }
  };

  const handleMoveTask = async (taskId, column) => {
    const task = tasks[taskId];
    await moveTask(taskId, column);
    if (column === 'completed') {
      toast.success(`✅ Completed: ${task?.title || 'Task'}`);
    } else if (column === 'inProgress') {
      toast.info(`🚀 Started: ${task?.title || 'Task'}`);
    }
  };

  const handleDeleteTask = async (taskId) => {
    const task = tasks[taskId];
    if (window.confirm('Delete this task?')) {
      await deleteTask(taskId);
      toast.success(`🗑️ Deleted: ${task?.title || 'Task'}`);
    }
  };

  const handleTagFilter = (tagId) => {
    if (tagFilter === tagId) {
      setTagFilter(null); // Toggle off
    } else {
      setTagFilter(tagId);
      toast.info(`Filtering by: ${TAGS[tagId]?.label || tagId}`);
    }
  };

  const clearTagFilter = () => {
    setTagFilter(null);
  };

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Filter tasks by tag
  const filterTasksByTag = (taskList) => {
    if (!tagFilter) return taskList;
    return taskList.filter(task => task.tags?.includes(tagFilter));
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewTask: handleNewTask,
    onRefresh: refresh,
    onSearch: focusSearch,
    onCloseModal: closeModal,
    isModalOpen
  });

  const currentlyWorking = getCurrentlyWorking();
  const archivedTasks = filterTasksByTag(getArchivedTasks(searchQuery));

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300
        ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4
            ${isDark ? 'bg-slate-800' : 'bg-white shadow-lg'}`}>
            🔐
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Loading ClosedBoard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300
      ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <Header 
        onNewTask={handleNewTask} 
        onRefresh={refresh}
        connected={connected}
        lastSync={lastSync}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showArchive={showArchive}
        onToggleArchive={() => setShowArchive(!showArchive)}
        showStats={showStats}
        onToggleStats={() => setShowStats(!showStats)}
        searchInputRef={searchInputRef}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Connection Status */}
        {!connected && (
          <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm
            ${isDark 
              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' 
              : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
            <span>⚠️</span>
            <span>Demo mode - API not connected</span>
          </div>
        )}

        {/* Search indicator */}
        {searchQuery && (
          <div className={`mb-4 p-3 rounded-xl flex items-center justify-between text-sm
            ${isDark 
              ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' 
              : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
            <span>🔍 Searching for "{searchQuery}"</span>
            <button 
              onClick={() => setSearchQuery('')} 
              className="hover:underline font-medium"
            >
              Clear
            </button>
          </div>
        )}

        {/* Tag Filter indicator */}
        {tagFilter && (
          <div className={`mb-4 p-3 rounded-xl flex items-center justify-between text-sm
            ${isDark 
              ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400' 
              : 'bg-violet-50 border border-violet-200 text-violet-700'}`}>
            <span className="flex items-center gap-2">
              🏷️ Filtering by tag: 
              <span className={`px-2 py-0.5 rounded-full text-white text-xs ${TAGS[tagFilter]?.color}`}>
                {TAGS[tagFilter]?.label}
              </span>
            </span>
            <button 
              onClick={clearTagFilter} 
              className="hover:underline font-medium"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Stats Panel */}
        {showStats && <StatsPanel tasks={tasks} />}

        {/* Learning Dashboard */}
        <LearningDashboard tasks={tasks} onTagFilter={handleTagFilter} />

        {/* Currently Working */}
        <CurrentlyWorking tasks={currentlyWorking} />

        {/* Archive View */}
        {showArchive ? (
          <div className="mb-6">
            <Column
              columnId="completed"
              tasks={archivedTasks}
              onMoveTask={handleMoveTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onUpdateSubtask={updateSubtasks}
              onTagFilter={handleTagFilter}
              activeTagFilter={tagFilter}
              isArchive={true}
            />
          </div>
        ) : (
          /* Kanban Board */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.keys(COLUMNS).map(columnId => (
              <Column
                key={columnId}
                columnId={columnId}
                tasks={filterTasksByTag(getTasksByColumn(columnId, searchQuery))}
                onMoveTask={handleMoveTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onUpdateSubtask={updateSubtasks}
                onTagFilter={handleTagFilter}
                activeTagFilter={tagFilter}
              />
            ))}
          </div>
        )}

        {/* Activity Feed */}
        <ActivityFeed history={history} />

        {/* Footer */}
        <footer className={`text-center py-8 text-sm transition-colors duration-300
          ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          <p className="flex items-center justify-center gap-2">
            Built with <span className="text-red-500">♥</span> by ClosedBot 🔐 for Rohail
          </p>
          <p className="text-xs mt-2 flex items-center justify-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {connected ? 'Live sync (30s)' : 'Offline mode'}
            {showArchive && <span>• 📦 Archive</span>}
          </p>
          <p className={`text-[10px] mt-3 ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>
            ⌨️ N: New • R: Refresh • /: Search • Esc: Close
          </p>
        </footer>
      </main>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveTask}
        editTask={editingTask}
      />

      {/* Toast Notifications */}
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
