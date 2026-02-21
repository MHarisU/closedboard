import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Pencil, GraduationCap, Plus, BookOpen, Square, X, BookMarked, ExternalLink, Bot, CalendarClock, GitBranch, Check } from 'lucide-react';
import { PRIORITIES, COLUMNS, DEFAULT_TAGS } from '../utils/constants';

export default function TaskModal({ isOpen, onClose, onSave, editTask, customTags, allTasks }) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [column, setColumn] = useState('backlog');
  const [isAITask, setIsAITask] = useState(false);
  const [tags, setTags] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [resources, setResources] = useState([]);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [blockedBy, setBlockedBy] = useState([]);

  const TAGS = (customTags && Object.keys(customTags).length > 0) ? customTags : DEFAULT_TAGS;
  const learningTopics = Object.entries(TAGS).filter(([_, t]) => t.isLearningTopic).map(([id]) => id);
  const isLearningTask = tags.includes('learning') || tags.some(t => learningTopics.includes(t));

  useEffect(() => {
    if (editTask) {
      setTitle(editTask.title);
      setDescription(editTask.description || '');
      setPriority(editTask.priority);
      setColumn(editTask.column);
      setIsAITask(editTask.isAITask || false);
      setTags(editTask.tags || []);
      setSubtasks(editTask.subtasks || []);
      setResources(editTask.resources || []);
      setDueDate(editTask.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : '');
      setBlockedBy(editTask.blockedBy || []);
    } else {
      setTitle(''); setDescription(''); setPriority('medium'); setColumn('backlog');
      setIsAITask(false); setTags([]); setSubtasks([]); setResources([]);
      setDueDate(''); setBlockedBy([]);
    }
    setNewSubtask(''); setNewResourceTitle(''); setNewResourceUrl('');
  }, [editTask, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      ...(editTask ? { id: editTask.id } : {}),
      title: title.trim(), description: description.trim(),
      priority, column, isAITask, tags, subtasks,
      resources: isLearningTask ? resources : [],
      dueDate: dueDate ? new Date(dueDate + 'T23:59:59').getTime() : null,
      blockedBy
    });
    onClose();
  };

  const toggleTag = (tagId) => {
    setTags(prev => {
      const newTags = prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId];
      if (learningTopics.includes(tagId) && !prev.includes(tagId) && !newTags.includes('learning')) return [...newTags, 'learning'];
      return newTags;
    });
  };

  const addSubtask = () => { if (!newSubtask.trim()) return; setSubtasks(prev => [...prev, { text: newSubtask.trim(), done: false }]); setNewSubtask(''); };
  const removeSubtask = (index) => setSubtasks(prev => prev.filter((_, i) => i !== index));
  const handleSubtaskKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } };
  const addResource = () => { if (!newResourceTitle.trim() || !newResourceUrl.trim()) return; setResources(prev => [...prev, { title: newResourceTitle.trim(), url: newResourceUrl.trim() }]); setNewResourceTitle(''); setNewResourceUrl(''); };
  const removeResource = (index) => setResources(prev => prev.filter((_, i) => i !== index));

  if (!isOpen) return null;

  const inputClass = `w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-200
    ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:bg-white'}
    border focus:ring-2 focus:ring-blue-500/20 focus:outline-none`;

  const labelClass = `block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`;

  const regularTags = Object.entries(TAGS).filter(([_, t]) => !t.isLearning && !t.isLearningTopic);
  const learningTags = Object.entries(TAGS).filter(([_, t]) => t.isLearning || t.isLearningTopic);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl animate-slide-in max-h-[90vh] overflow-hidden
        ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>

        <div className={`px-5 py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {editTask
              ? <><Pencil size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} /> Edit Task</>
              : isLearningTask
                ? <><GraduationCap size={18} className="text-violet-500" /> New Learning Task</>
                : <><Plus size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} /> New Task</>}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div>
            <label className={labelClass}>Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass}
              placeholder={isLearningTask ? 'What are you learning?' : 'What needs to be done?'} autoFocus />
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} resize-none`} rows={2}
              placeholder={isLearningTask ? 'Learning goals, notes...' : 'Add more details...'} />
          </div>

          {/* Due Date */}
          <div>
            <label className={`${labelClass} flex items-center gap-1.5`}>
              <CalendarClock size={13} /> Due Date
            </label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className={inputClass} />
          </div>

          {/* Blocked By */}
          {(() => {
            const available = Object.values(allTasks || {}).filter(t =>
              t.column !== 'completed' && t.id !== editTask?.id
            );
            if (available.length === 0) return null;
            return (
              <div>
                <label className={`${labelClass} flex items-center gap-1.5`}>
                  <GitBranch size={13} /> Blocked By
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {available.map(t => {
                    const selected = blockedBy.includes(t.id);
                    return (
                      <button key={t.id} type="button"
                        onClick={() => setBlockedBy(prev => selected ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                        className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors
                          ${selected
                            ? isDark ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
                            : isDark ? 'hover:bg-slate-800 text-slate-400 border border-transparent' : 'hover:bg-slate-50 text-slate-600 border border-transparent'}`}>
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0
                          ${selected ? 'bg-blue-500 border-blue-500 text-white' : isDark ? 'border-slate-600' : 'border-slate-300'}`}>
                          {selected && <Check size={10} />}
                        </span>
                        <span className="truncate">{t.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Tags */}
          <div>
            <label className={labelClass}>Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {regularTags.map(([key, tag]) => (
                <button key={key} type="button" onClick={() => toggleTag(key)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200
                    ${tags.includes(key) ? `${tag.color} text-white shadow-lg` : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {tag.label}
                </button>
              ))}
            </div>
            {learningTags.length > 0 && (
              <div className={`flex flex-wrap gap-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                {learningTags.map(([key, tag]) => (
                  <button key={key} type="button" onClick={() => toggleTag(key)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200
                      ${tags.includes(key) ? `${tag.color} text-white shadow-lg` : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {tag.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subtasks */}
          <div>
            <label className={labelClass}>{isLearningTask ? 'Concepts to Learn' : 'Subtasks'}</label>
            <div className="space-y-2">
              {subtasks.map((subtask, index) => (
                <div key={index} className={`flex items-center gap-2 text-sm p-2 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{isLearningTask ? <BookOpen size={14} /> : <Square size={14} />}</span>
                  <span className={`flex-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{subtask.text}</span>
                  <button type="button" onClick={() => removeSubtask(index)}
                    className={`p-1 rounded transition-colors ${isDark ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input type="text" value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={handleSubtaskKeyDown} placeholder={isLearningTask ? 'Add a concept...' : 'Add a subtask...'}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'} border focus:ring-2 focus:ring-blue-500/20 focus:outline-none`} />
                <button type="button" onClick={addSubtask}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Resources */}
          {isLearningTask && (
            <div>
              <label className={`${labelClass} flex items-center gap-1.5`}><BookMarked size={13} /> Resources</label>
              <div className="space-y-2">
                {resources.map((resource, index) => (
                  <div key={index} className={`flex items-center gap-2 text-sm p-2 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <ExternalLink size={14} className="text-blue-500 shrink-0" />
                    <a href={resource.url} target="_blank" rel="noopener noreferrer"
                      className={`flex-1 hover:underline ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{resource.title}</a>
                    <button type="button" onClick={() => removeResource(index)}
                      className={`p-1 rounded transition-colors ${isDark ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input type="text" value={newResourceTitle} onChange={(e) => setNewResourceTitle(e.target.value)}
                    placeholder="Title"
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'} border focus:ring-2 focus:ring-blue-500/20 focus:outline-none`} />
                  <input type="url" value={newResourceUrl} onChange={(e) => setNewResourceUrl(e.target.value)}
                    placeholder="https://..."
                    className={`flex-1 px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'} border focus:ring-2 focus:ring-blue-500/20 focus:outline-none`} />
                  <button type="button" onClick={addResource}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Priority & Column */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
                {Object.entries(PRIORITIES).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Column</label>
              <select value={column} onChange={(e) => setColumn(e.target.value)} className={inputClass}>
                {Object.entries(COLUMNS).map(([key, col]) => (<option key={key} value={key}>{col.label}</option>))}
              </select>
            </div>
          </div>

          <label className={`flex items-center gap-2.5 cursor-pointer p-2.5 -mx-2.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
            <input type="checkbox" checked={isAITask} onChange={(e) => setIsAITask(e.target.checked)} className="w-4 h-4 rounded" />
            <span className={`text-sm flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <Bot size={15} className="text-blue-500" /> AI/ClosedBot task
            </span>
          </label>
        </form>

        <div className={`px-5 py-4 border-t flex gap-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <button type="button" onClick={onClose}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Cancel
          </button>
          <button onClick={handleSubmit}
            className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-lg
              ${isLearningTask ? 'bg-gradient-to-r from-violet-500 to-purple-500 shadow-violet-500/25 hover:shadow-violet-500/40' : 'bg-blue-500 shadow-blue-500/25 hover:bg-blue-600'}`}>
            {editTask ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
