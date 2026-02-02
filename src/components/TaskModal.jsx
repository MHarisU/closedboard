import { useState, useEffect } from 'react';
import { PRIORITIES, TAGS } from '../utils/constants';

export default function TaskModal({ isOpen, onClose, onSave, editTask }) {
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 dark:bg-slate-900 bg-white border border-slate-700 dark:border-slate-700 border-slate-200 rounded-xl w-full max-w-lg shadow-2xl animate-slide-in max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-slate-700 dark:border-slate-700 border-slate-200 sticky top-0 bg-slate-900 dark:bg-slate-900 bg-white">
          <h2 className="text-lg font-semibold text-slate-100 dark:text-slate-100 text-slate-900">
            {editTask ? '✏️ Edit Task' : '➕ New Task'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 dark:text-slate-300 text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-800 dark:bg-slate-800 bg-slate-100 border border-slate-700 dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2 text-slate-100 dark:text-slate-100 text-slate-900 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 dark:text-slate-300 text-slate-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 dark:bg-slate-800 bg-slate-100 border border-slate-700 dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2 text-slate-100 dark:text-slate-100 text-slate-900 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              placeholder="Add more details..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-300 dark:text-slate-300 text-slate-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TAGS).map(([key, tag]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleTag(key)}
                  className={`text-xs px-2 py-1 rounded transition-all ${
                    tags.includes(key)
                      ? `${tag.color} text-white ring-2 ring-white/30`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-sm font-medium text-slate-300 dark:text-slate-300 text-slate-700 mb-2">Subtasks</label>
            <div className="space-y-2">
              {subtasks.map((subtask, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">☐</span>
                  <span className="flex-1 text-slate-300">{subtask.text}</span>
                  <button
                    type="button"
                    onClick={() => removeSubtask(index)}
                    className="text-slate-500 hover:text-red-400"
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
                  className="flex-1 bg-slate-800 dark:bg-slate-800 bg-slate-100 border border-slate-700 dark:border-slate-700 border-slate-300 rounded px-2 py-1 text-sm text-slate-100 dark:text-slate-100 text-slate-900 
                    focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  className="px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 text-sm"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 dark:text-slate-300 text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-800 dark:bg-slate-800 bg-slate-100 border border-slate-700 dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2 text-slate-100 dark:text-slate-100 text-slate-900 
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(PRIORITIES).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {val.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 dark:text-slate-300 text-slate-700 mb-1">Column</label>
              <select
                value={column}
                onChange={(e) => setColumn(e.target.value)}
                className="w-full bg-slate-800 dark:bg-slate-800 bg-slate-100 border border-slate-700 dark:border-slate-700 border-slate-300 rounded-lg px-3 py-2 text-slate-100 dark:text-slate-100 text-slate-900 
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="backlog">📋 Backlog</option>
                <option value="inProgress">🚀 In Progress</option>
                <option value="completed">✅ Completed</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAITask"
              checked={isAITask}
              onChange={(e) => setIsAITask(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="isAITask" className="text-sm text-slate-300 dark:text-slate-300 text-slate-700">
              🤖 AI/ClosedBot task
            </label>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 dark:bg-slate-800 bg-slate-200 text-slate-300 dark:text-slate-300 text-slate-700 rounded-lg 
                hover:bg-slate-700 dark:hover:bg-slate-700 hover:bg-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg 
                hover:bg-blue-500 transition-colors font-medium"
            >
              {editTask ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
