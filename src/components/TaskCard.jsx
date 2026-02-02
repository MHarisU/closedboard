import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { PRIORITIES, TAGS, formatTime } from '../utils/constants';

export default function TaskCard({ task, onMove, onEdit, onDelete, onUpdateSubtask }) {
  const { isDark } = useTheme();
  const [expandedSubtasks, setExpandedSubtasks] = useState(false);
  const priority = PRIORITIES[task.priority];
  
  const handleDragStart = (e) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const priorityStyles = {
    low: isDark 
      ? 'bg-slate-500/20 text-slate-400 border-slate-500/30' 
      : 'bg-slate-100 text-slate-600 border-slate-200',
    medium: isDark 
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
      : 'bg-amber-50 text-amber-600 border-amber-200',
    high: isDark 
      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' 
      : 'bg-orange-50 text-orange-600 border-orange-200',
    urgent: isDark 
      ? 'bg-red-500/20 text-red-400 border-red-500/30' 
      : 'bg-red-50 text-red-600 border-red-200'
  };

  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter(s => s.done).length;
  const hasSubtasks = subtasks.length > 0;
  const subtaskProgress = hasSubtasks ? (completedSubtasks / subtasks.length) * 100 : 0;

  const toggleSubtask = (index) => {
    const newSubtasks = [...subtasks];
    newSubtasks[index] = { ...newSubtasks[index], done: !newSubtasks[index].done };
    onUpdateSubtask(task.id, newSubtasks);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`task-card rounded-xl p-4 mb-3 border transition-all duration-200
        ${isDark 
          ? 'bg-slate-800/80 border-slate-700/50 hover:border-slate-600' 
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'}
        ${task.isAITask ? 'border-l-4 border-l-blue-500' : ''}
        ${task.column === 'completed' ? 'opacity-70' : ''}`}
    >
      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {task.tags.map(tagId => {
            const tag = TAGS[tagId];
            if (!tag) return null;
            return (
              <span 
                key={tagId}
                className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${tag.color}`}
              >
                {tag.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className={`font-medium text-sm leading-snug flex-1 min-w-0
          ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {task.isAITask && <span className="mr-1.5">🤖</span>}
          {task.column === 'completed' && <span className="mr-1.5 text-emerald-500">✓</span>}
          {task.title}
        </h4>
        <span className={`text-[10px] px-2 py-1 rounded-full border font-medium whitespace-nowrap
          ${priorityStyles[task.priority]}`}>
          {priority.icon} {priority.label}
        </span>
      </div>
      
      {/* Description */}
      {task.description && (
        <p className={`text-xs mb-3 line-clamp-2 leading-relaxed
          ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {task.description}
        </p>
      )}

      {/* Subtasks */}
      {hasSubtasks && (
        <div className="mb-3">
          <button
            onClick={() => setExpandedSubtasks(!expandedSubtasks)}
            className={`text-xs flex items-center gap-1.5 mb-2 transition-colors
              ${isDark ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <span className="text-[10px]">{expandedSubtasks ? '▼' : '▶'}</span>
            <span>Subtasks</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium
              ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              {completedSubtasks}/{subtasks.length}
            </span>
          </button>
          
          {/* Progress bar */}
          <div className={`w-full h-1.5 rounded-full overflow-hidden
            ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${subtaskProgress}%` }}
            />
          </div>

          {expandedSubtasks && (
            <div className="mt-2.5 space-y-1.5">
              {subtasks.map((subtask, index) => (
                <label 
                  key={index}
                  className={`flex items-center gap-2.5 text-xs cursor-pointer p-1.5 -mx-1.5 rounded-lg transition-colors
                    ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={subtask.done}
                    onChange={() => toggleSubtask(index)}
                    className={`w-3.5 h-3.5 rounded border-2 transition-colors
                      ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'}`}
                  />
                  <span className={`transition-all duration-200 ${
                    subtask.done 
                      ? 'line-through ' + (isDark ? 'text-slate-500' : 'text-slate-400')
                      : isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {subtask.text}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Footer */}
      <div className={`flex items-center justify-between text-[11px] pt-2 border-t
        ${isDark ? 'border-slate-700/50 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
        <span>
          {task.completedAt ? `Done ${formatTime(task.completedAt)}` : formatTime(task.createdAt)}
        </span>
        <div className="flex gap-0.5">
          <button 
            onClick={() => onEdit(task)}
            className={`p-1.5 rounded-lg transition-colors
              ${isDark ? 'hover:bg-slate-700 hover:text-slate-300' : 'hover:bg-slate-100 hover:text-slate-600'}`}
            title="Edit"
          >
            ✏️
          </button>
          <button 
            onClick={() => onDelete(task.id)}
            className={`p-1.5 rounded-lg transition-colors
              ${isDark ? 'hover:bg-red-500/20 hover:text-red-400' : 'hover:bg-red-50 hover:text-red-500'}`}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
