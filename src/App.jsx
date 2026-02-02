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
    addTask,
    moveTask,
    updateTask,
    deleteTask,
    getTasksByColumn,
    getCurrentlyWorking,
    resetBoard
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

  const handleSaveTask = (taskData) => {
    if (taskData.id) {
      updateTask(taskData.id, taskData);
    } else {
      addTask(taskData);
    }
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm('Delete this task?')) {
      deleteTask(taskId);
    }
  };

  const currentlyWorking = getCurrentlyWorking();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header onNewTask={handleNewTask} onReset={resetBoard} />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
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
          <p className="text-xs mt-1">React + Vite + Tailwind CSS</p>
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
