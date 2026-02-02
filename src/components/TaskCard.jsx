import { useState } from 'react';
import { PRIORITIES, TAGS, formatTime } from '../utils/constants';

export default function TaskCard({ task, onMove, onEdit, onDelete, onUpdateSubtask }) {
  const [expandedSubtasks, setExpandedSubtasks] = useState(false);
  const priority = PRIORITIES[task.priority];
  
  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const priorityColors = {
    low: 'bg-slate-500/20 text-slate-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    high: 'bg-orange-500/20 text-orange-400',
    urgent: 'bg-red-500/20 text-red-400'
  };

  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.done).length;
  const hasSubtasks = subtasks.length > 0;

  const toggleSubtask = (index) => {
    const newSubtasks = [...subtasks];
    newSubtasks[index] = { ...newSubtasks[index], done: !newSubtasks[index].done };
    onUpdateSubtask(task.id, newSubtasks);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`task-card bg-slate-800 dark:bg-slate-800 bg-white 
        border border-slate-700 dark:border-slate-700 border-slate-200 
        rounded-lg p-3 sm:p-4 mb-3 
        ${task.isAITask ? 'border-l-4 border-l-blue-500' : ''} 
        ${task.column === 'completed' ? 'opacity-75' : ''}
        overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map(tagId => {
            const tag = TAGS[tagId];
            if (!tag) return null;
            return (
              <span 
                key={tagId}
                className={`text-[10px] px-1.5 py-0.5 rounded text-white ${tag.color}`}
              >
                {tag.label}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-slate-100 dark:text-slate-100 text-slate-900 text-sm leading-tight flex-1 min-w-0 break-words">
          {task.isAITask && <span className="mr-1">🤖</span>}
          {task.column === 'completed' && <span className="mr-1">✓</span>}
          {task.title}
        </h4>
        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${priorityColors[task.priority]}`}>
          {priority.icon} {priority.label}
        </span>
      </div>
      
      {task.description && (
        <p className="text-xs text-slate-400 mb-3 line-clamp-2 break-words">{task.description}</p>
      )}

      {/* Subtasks */}
      {hasSubtasks && (
        <div className="mb-3">
          <button
            onClick={() => setExpandedSubtasks(!expandedSubtasks)}
            className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1 mb-1"
          >
            <span>{expandedSubtasks ? '▼' : '▶'}</span>
            <span>Subtasks ({completedSubtasks}/{subtasks.length})</span>
          </button>
          
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
            />
          </div>

          {expandedSubtasks && (
            <div className="mt-2 space-y-1">
              {subtasks.map((subtask, index) => (
                <label 
                  key={index}
                  className="flex items-center gap-2 text-xs cursor-pointer hover:bg-slate-700/50 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={subtask.done}
                    onChange={() => toggleSubtask(index)}
                    className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                  />
                  <span className={subtask.done ? 'line-through text-slate-500' : 'text-slate-300'}>
                    {subtask.text}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs text-slate-500 gap-2">
        <span className="truncate">
          {task.completedAt ? `Done ${formatTime(task.completedAt)}` : formatTime(task.createdAt)}
        </span>
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
