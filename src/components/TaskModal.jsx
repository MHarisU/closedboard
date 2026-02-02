import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { PRIORITIES, TAGS } from '../utils/constants';

export default function TaskModal({ isOpen, onClose, onSave, editTask }) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [column, setColumn] = useState('backlog');
  const [isAITask, setIsAITask] = useState(false);
  const [tags, setTags] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description || '');
      setPriority(editTask.priority);
      setColumn(editTask.column);
      setIsAITask(editTask.isAITask || false);
      setTags(editTask.tags || []);
      setSubtasks(editTask.subtasks || []);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setColumn('backlog');
      setIsAITask(false);
      setTags([]);
      setSubtasks([]);
    }
    setNewSubtask('');
  }, [editTask, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onSave({
      ...(editTask ? { id: editTask.id } : {}),
      title: title.trim(),
      description: description.trim(),
      priority,
      column,
      isAITask,
      tags,
      subtasks
    });
    
    onClose();
  };

  const toggleTag = (tagId) => {
    setTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks(prev => [...prev, { text: newSubtask.trim(), done: false }]);
    setNewSubtask('');
  };

  const removeSubtask = (index) => {
    setSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubtaskKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSubtask();
    }
  };

  if (!isOpen) return null;

  const inputClass = `w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-200
    ${isDark 
      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-slate-600' 
      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:bg-white'}
    border focus:ring-2 focus:ring-blue-500/20 focus:outline-none`;

  const labelClass = `block text-xs font-medium mb-1.5
    ${isDark ? 'text-slate-400' : 'text-slate-600'}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl animate-slide-in max-h-[90vh] overflow-hidden
        ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>
        
        {/* Header */}
        <div className={`px-5 py-4 border-b
          ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className={`text-lg font-semibold
            ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {editTask ? '✏️ Edit Task' : '➕ New Task'}
          </h2>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Title */}
          <div>
            <label className={labelClass}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>
          
          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Add more details..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className={labelClass}>Tags</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TAGS).map(([key, tag]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleTag(key)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200
                    ${tags.includes(key)
                      ? `${tag.color} text-white shadow-lg`
                      : isDark 
                        ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className={labelClass}>Subtasks</label>
            <div className="space-y-2">
              {subtasks.map((subtask, index) => (
                <div key={index} className={`flex items-center gap-2 text-sm p-2 rounded-lg
                  ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>☐</span>
                  <span className={`flex-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {subtask.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSubtask(index)}
                    className={`p-1 rounded transition-colors
                      ${isDark ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={handleSubtaskKeyDown}
                  placeholder="Add a subtask..."
                  className={`flex-1 px-3 py-2 rounded-lg text-sm
                    ${isDark 
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}
                    border focus:ring-2 focus:ring-blue-500/20 focus:outline-none`}
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isDark 
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
          
          {/* Priority & Column */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={inputClass}
              >
                {Object.entries(PRIORITIES).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {val.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className={labelClass}>Column</label>
              <select
                value={column}
                onChange={(e) => setColumn(e.target.value)}
                className={inputClass}
              >
                <option value="backlog">📋 Backlog</option>
                <option value="inProgress">🚀 In Progress</option>
                <option value="completed">✅ Completed</option>
              </select>
            </div>
          </div>
          
          {/* AI Task */}
          <label className={`flex items-center gap-2.5 cursor-pointer p-2.5 -mx-2.5 rounded-lg transition-colors
            ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
            <input
              type="checkbox"
              checked={isAITask}
              onChange={(e) => setIsAITask(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              🤖 AI/ClosedBot task
            </span>
          </label>
        </form>

        {/* Footer */}
        <div className={`px-5 py-4 border-t flex gap-3
          ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${isDark 
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium
              hover:bg-blue-600 transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            {editTask ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
