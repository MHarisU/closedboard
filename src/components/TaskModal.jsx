import { useState, useEffect } from 'react';
import { PRIORITIES } from '../utils/constants';

export default function TaskModal({ isOpen, onClose, onSave, editTask }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [column, setColumn] = useState('backlog');
  const [isAITask, setIsAITask] = useState(false);

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description || '');
      setPriority(editTask.priority);
      setColumn(editTask.column);
      setIsAITask(editTask.isAITask || false);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setColumn('backlog');
      setIsAITask(false);
    }
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
      isAITask
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-slide-in">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">
            {editTask ? '✏️ Edit Task' : '➕ New Task'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Add more details..."
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(PRIORITIES).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {val.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Column</label>
              <select
                value={column}
                onChange={(e) => setColumn(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 
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
            <label htmlFor="isAITask" className="text-sm text-slate-300">
              🤖 AI/ClosedBot task
            </label>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg 
                hover:bg-slate-700 transition-colors"
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
