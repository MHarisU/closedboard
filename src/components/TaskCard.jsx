import { PRIORITIES, formatTime } from '../utils/constants';

export default function TaskCard({ task, onMove, onEdit, onDelete }) {
  const priority = PRIORITIES[task.priority];
  
  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Dynamic priority colors
  const priorityColors = {
    low: 'bg-slate-500/20 text-slate-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400'
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`task-card bg-slate-800 border border-slate-700 rounded-lg p-3 sm:p-4 mb-3 
        ${task.isAITask ? 'border-l-4 border-l-blue-500' : ''} overflow-hidden`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-slate-100 text-sm leading-tight flex-1 min-w-0 break-words">
          {task.isAITask && <span className="mr-1">🤖</span>}
          {task.title}
        </h4>
        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${priorityColors[task.priority]}`}>
          {priority.icon} {priority.label}
        </span>
      </div>
      
      {task.description && (
        <p className="text-xs text-slate-400 mb-3 line-clamp-2 break-words">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between text-xs text-slate-500 gap-2">
        <span className="truncate">{formatTime(task.createdAt)}</span>
        <div className="flex gap-1 flex-shrink-0">
          <button 
            onClick={() => onEdit(task)}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors touch-manipulation"
            title="Edit"
          >
            ✏️
          </button>
          <button 
            onClick={() => onDelete(task.id)}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors touch-manipulation"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
