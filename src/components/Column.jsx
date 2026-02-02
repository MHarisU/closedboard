import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import TaskCard from './TaskCard';
import { COLUMNS } from '../utils/constants';

export default function Column({ columnId, tasks, onMoveTask, onEditTask, onDeleteTask, onUpdateSubtask, isArchive = false }) {
  const { isDark } = useTheme();
  const [isDragOver, setIsDragOver] = useState(false);
  const column = COLUMNS[columnId];
  
  const gradients = {
    backlog: isDark 
      ? 'from-slate-500/10 to-transparent' 
      : 'from-slate-100 to-transparent',
    inProgress: isDark 
      ? 'from-blue-500/10 to-transparent' 
      : 'from-blue-50 to-transparent',
    completed: isDark 
      ? 'from-emerald-500/10 to-transparent' 
      : 'from-emerald-50 to-transparent'
  };

  const iconBg = {
    backlog: isDark ? 'bg-slate-500/20' : 'bg-slate-100',
    inProgress: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
    completed: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onMoveTask(taskId, columnId);
    }
  };

  const emptyMessages = {
    backlog: { icon: '📋', text: 'Add tasks to plan your work' },
    inProgress: { icon: '🚀', text: 'Drag tasks here to start' },
    completed: { icon: '✨', text: 'Completed tasks appear here' }
  };

  return (
    <div 
      className={`flex flex-col rounded-2xl border transition-all duration-200
        ${isDark 
          ? 'bg-slate-900/50 border-slate-800' 
          : 'bg-white/50 border-slate-200 shadow-sm'}
        ${isDragOver ? 'ring-2 ring-blue-500/50 border-blue-500/50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className={`p-4 rounded-t-2xl bg-gradient-to-b ${gradients[columnId]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${iconBg[columnId]}`}>
              {isArchive ? '📦' : column.title.split(' ')[0]}
            </div>
            <h3 className={`font-semibold text-sm
              ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {isArchive ? 'Archive' : column.title.split(' ').slice(1).join(' ')}
            </h3>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium
            ${isDark 
              ? 'bg-slate-800 text-slate-400' 
              : 'bg-slate-100 text-slate-600'}`}>
            {tasks.length}
          </span>
        </div>
      </div>
      
      {/* Tasks */}
      <div className="flex-1 p-3 overflow-y-auto column-scroll max-h-[calc(100vh-380px)] min-h-[200px]">
        {tasks.length === 0 ? (
          <div className={`text-center py-12 px-4
            ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            <div className="text-3xl mb-3 opacity-50">
              {isArchive ? '📦' : emptyMessages[columnId].icon}
            </div>
            <p className="text-xs">
              {isArchive ? 'Completed tasks appear here' : emptyMessages[columnId].text}
            </p>
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task}
              onMove={onMoveTask}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onUpdateSubtask={onUpdateSubtask}
            />
          ))
        )}
      </div>
    </div>
  );
}
