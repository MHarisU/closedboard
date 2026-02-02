import { useState } from 'react';
import TaskCard from './TaskCard';
import { COLUMNS } from '../utils/constants';

export default function Column({ columnId, tasks, onMoveTask, onEditTask, onDeleteTask }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const column = COLUMNS[columnId];
  
  const colorClasses = {
    slate: 'from-slate-500/20',
    blue: 'from-blue-500/20',
    green: 'from-green-500/20'
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

  return (
    <div 
      className={`flex flex-col bg-slate-900/50 rounded-xl border border-slate-800 
        ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className={`p-4 border-b border-slate-800 bg-gradient-to-r ${colorClasses[column.color]} to-transparent rounded-t-xl`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-100">{column.title}</h3>
          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>
      
      {/* Tasks Container */}
      <div className="flex-1 p-3 overflow-y-auto column-scroll max-h-[calc(100vh-380px)] min-h-[200px]">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-slate-600 text-sm">
            {columnId === 'backlog' && 'Drop tasks here to plan'}
            {columnId === 'inProgress' && 'Drag tasks here to start'}
            {columnId === 'completed' && 'Done tasks appear here ✨'}
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task}
              onMove={onMoveTask}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))
        )}
      </div>
    </div>
  );
}
