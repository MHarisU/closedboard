import { PRIORITIES, formatTime } from '../utils/constants';

export default function TaskCard({ task, onMove, onEdit, onDelete }) {
  const priority = PRIORITIES[task.priority];
  
  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`task-card bg-slate-800 border border-slate-700 rounded-lg p-4 mb-3 
        ${task.isAITask ? 'border-l-4 border-l-blue-500' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-slate-100 text-sm leading-tight flex-1">
          {task.isAITask && <span className="mr-1">🤖</span>}
          {task.title}
        </h4>
        <span className={`text-xs px-2 py-0.5 rounded-full bg-${priority.color}-500/20 text-${priority.color}-400`}>
          {priority.icon} {priority.label}
        </span>
      </div>
      
      {task.description && (
        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{formatTime(task.createdAt)}</span>
        <div className="flex gap-1">
          <button 
            onClick={() => onEdit(task)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Edit"
          >
            ✏️
          </button>
          <button 
            onClick={() => onDelete(task.id)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
