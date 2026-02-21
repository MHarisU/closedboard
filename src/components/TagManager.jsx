import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { X, Plus, Pencil, Trash2, Tag, Check } from 'lucide-react';
import { TAG_COLORS } from '../utils/constants';

export default function TagManager({ isOpen, onClose, tags, onCreate, onUpdate, onDelete }) {
  const { isDark } = useTheme();
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('bg-blue-500');
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    const result = await onCreate({ label: newLabel.trim(), color: newColor });
    if (result?.success) { setNewLabel(''); setNewColor('bg-blue-500'); }
  };

  const startEdit = (id, tag) => { setEditingId(id); setEditLabel(tag.label); setEditColor(tag.color); };

  const handleUpdate = async () => {
    if (!editLabel.trim() || !editingId) return;
    await onUpdate(editingId, { label: editLabel.trim(), color: editColor });
    setEditingId(null);
  };

  const tagEntries = Object.entries(tags);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl animate-slide-in max-h-[80vh] overflow-hidden
        ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>

        <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className={`text-lg font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Tag size={18} /> Manage Tags
          </h2>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors
            ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-160px)]">
          <div className="p-4 space-y-1.5">
            {tagEntries.map(([id, tag]) => (
              <div key={id}>
                {editingId === id ? (
                  <div className={`p-3 rounded-xl space-y-2 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-sm border
                        ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}
                        focus:outline-none focus:ring-1 focus:ring-blue-500`}
                      autoFocus />
                    <div className="flex flex-wrap gap-1.5">
                      {TAG_COLORS.map(c => (
                        <button key={c} onClick={() => setEditColor(c)}
                          className={`w-6 h-6 rounded-full ${c} transition-transform
                            ${editColor === c ? 'ring-2 ring-blue-400 ring-offset-1 scale-110' : 'hover:scale-110'}`} />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={handleUpdate}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium">
                        <Check size={12} /> Save
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-colors
                    ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                    <span className={`w-3 h-3 rounded-full shrink-0 ${tag.color}`} />
                    <span className={`flex-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{tag.label}</span>
                    {tag.isLearning && <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>learning</span>}
                    {tag.isLearningTopic && <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'}`}>topic</span>}
                    <div className="hidden group-hover:flex gap-0.5">
                      <button onClick={() => startEdit(id, tag)}
                        className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => onDelete(id)}
                        className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={`px-4 py-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex gap-2 mb-2">
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
              placeholder="New tag name" onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className={`flex-1 px-3 py-2 rounded-lg text-sm border
                ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'}
                focus:outline-none focus:ring-1 focus:ring-blue-500`} />
            <button onClick={handleCreate} disabled={!newLabel.trim()}
              className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-50 transition-opacity
                flex items-center gap-1.5">
              <Plus size={14} /> Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TAG_COLORS.map(c => (
              <button key={c} onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full ${c} transition-transform
                  ${newColor === c ? 'ring-2 ring-blue-400 ring-offset-1 scale-110' : 'hover:scale-110'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
