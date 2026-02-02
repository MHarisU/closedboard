import { useState } from 'react';
import { useBoard } from './hooks/useBoard';
import Header from './components/Header';
import Column from './components/Column';
import CurrentlyWorking from './components/CurrentlyWorking';
import ActivityFeed from './components/ActivityFeed';
import TaskModal from './components/TaskModal';
import { COLUMNS } from './utils/constants';

export default function App() {
  const {
    history,
    loading,
    connected,
    addTask,
    moveTask,
    updateTask,
    deleteTask,
    getTasksByColumn,
    getCurrentlyWorking,
    resetBoard,
    refresh
  } = useBoard();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔐</div>
          <p className="text-slate-400">Loading ClosedBoard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header 
        onNewTask={handleNewTask} 
        onReset={resetBoard}
        onRefresh={refresh}
        connected={connected}
      />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Connection Status */}
        {!connected && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400 flex items-center gap-2">
            <span>⚠️</span>
            <span>Demo mode - API not connected. Data stored locally.</span>
          </div>
        )}

        {/* Currently Working Section */}
        <div className="mb-6">
          <CurrentlyWorking tasks={currentlyWorking} />
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Object.keys(COLUMNS).map(columnId => (
            <Column
              key={columnId}
              columnId={columnId}
              tasks={getTasksByColumn(columnId)}
              onMoveTask={moveTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>

        {/* Activity Feed */}
        <ActivityFeed history={history} />

        {/* Footer */}
        <footer className="text-center py-8 text-slate-600 text-sm">
          <p>Built with 💙 by ClosedBot 🔐 for Rohail</p>
          <p className="text-xs mt-1">
            {connected ? '🟢 Connected to Workspace API' : '🟡 LocalStorage Mode'}
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
