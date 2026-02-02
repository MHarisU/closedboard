import { useState } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useBoard } from './hooks/useBoard';
import Header from './components/Header';
import Column from './components/Column';
import CurrentlyWorking from './components/CurrentlyWorking';
import ActivityFeed from './components/ActivityFeed';
import TaskModal from './components/TaskModal';
import { COLUMNS } from './utils/constants';

function AppContent() {
  const {
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchive, setShowArchive] = useState(false);

  const handleNewTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData) => {
    if (taskData.id) {
      await updateTask(taskData.id, taskData);
    } else {
      await addTask(taskData);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Delete this task?')) {
      await deleteTask(taskId);
    }
  };

  const currentlyWorking = getCurrentlyWorking();
  const archivedTasks = getArchivedTasks(searchQuery);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔐</div>
          <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Loading ClosedBoard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      <Header 
        onNewTask={handleNewTask} 
        onRefresh={refresh}
        connected={connected}
        lastSync={lastSync}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showArchive={showArchive}
        onToggleArchive={() => setShowArchive(!showArchive)}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Connection Status */}
        {!connected && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400 flex items-center gap-2">
            <span>⚠️</span>
            <span>Demo mode - API not connected. Data stored locally.</span>
          </div>
        )}

        {/* Search indicator */}
        {searchQuery && (
          <div className="mb-4 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-400 flex items-center justify-between">
            <span>🔍 Searching for "{searchQuery}"</span>
            <button onClick={() => setSearchQuery('')} className="hover:text-blue-300">Clear</button>
          </div>
        )}

        {/* Currently Working Section */}
        <div className="mb-6">
          <CurrentlyWorking tasks={currentlyWorking} />
        </div>

        {/* Archive View */}
        {showArchive ? (
          <div className="mb-6">
            <Column
              columnId="completed"
              tasks={archivedTasks}
              onMoveTask={moveTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onUpdateSubtask={updateSubtasks}
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
                tasks={getTasksByColumn(columnId, searchQuery)}
                onMoveTask={moveTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onUpdateSubtask={updateSubtasks}
              />
            ))}
          </div>
        )}

        {/* Activity Feed */}
        <ActivityFeed history={history} />

        {/* Footer */}
        <footer className={`text-center py-8 text-sm ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          <p>Built with 💙 by ClosedBot 🔐 for Rohail</p>
          <p className="text-xs mt-1">
            {connected ? '🟢 Live sync enabled (30s)' : '🟡 LocalStorage Mode'}
            {showArchive && ' • 📦 Archive View'}
          </p>
        </footer>
      </main>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        editTask={editingTask}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
