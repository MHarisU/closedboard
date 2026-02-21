import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ChevronDown, Plus, Pencil, Trash2, X, Check, Layout } from 'lucide-react';
import { BOARD_COLORS } from '../utils/constants';

const colorMap = {
  blue: 'bg-blue-500', emerald: 'bg-emerald-500', violet: 'bg-violet-500',
  amber: 'bg-amber-500', rose: 'bg-rose-500', cyan: 'bg-cyan-500',
  orange: 'bg-orange-500', pink: 'bg-pink-500'
};

export default function BoardSelector({ boards, currentBoardId, onSwitch, onCreate, onUpdate, onDelete }) {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const dropdownRef = useRef(null);

  const current = boards.find(b => b.id === currentBoardId) || boards[0] || { name: 'My Board', color: 'blue' };

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const result = await onCreate({ name: name.trim(), color });
    if (result?.success) { setIsCreating(false); setName(''); setColor('blue'); }
  };

  const startEdit = (board) => { setEditingId(board.id); setName(board.name); setColor(board.color); };

  const handleUpdate = async () => {
    if (!name.trim() || !editingId) return;
    await onUpdate(editingId, { name: name.trim(), color });
    setEditingId(null); setName(''); setColor('blue');
  };

  const handleDelete = async (id) => {
    if (boards.length <= 1) return;
    await onDelete(id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
          ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${colorMap[current.color] || 'bg-blue-500'}`} />
        <span className="max-w-[120px] truncate">{current.name}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 mt-1.5 w-64 rounded-xl border shadow-xl z-50 overflow-hidden
          ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className={`px-3 py-2 border-b text-xs font-medium flex items-center gap-1.5
            ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
            <Layout size={12} /> Workspaces
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {boards.map(board => (
              <div key={board.id}>
                {editingId === board.id ? (
                  <div className={`px-3 py-2 space-y-2 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <input value={name} onChange={e => setName(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-sm border
                        ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}
                        focus:outline-none focus:ring-1 focus:ring-blue-500`}
                      autoFocus />
                    <div className="flex gap-1">
                      {BOARD_COLORS.map(c => (
                        <button key={c} onClick={() => setColor(c)}
                          className={`w-5 h-5 rounded-full ${colorMap[c]} ${color === c ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`} />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={handleUpdate}
                        className="flex-1 px-2 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium">Save</button>
                      <button onClick={() => { setEditingId(null); setName(''); }}
                        className={`px-2 py-1 rounded-lg text-xs ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 px-3 py-2 cursor-pointer group transition-colors
                    ${board.id === currentBoardId
                      ? isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'
                      : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-50 text-slate-700'}`}
                    onClick={() => { onSwitch(board.id); setIsOpen(false); }}>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorMap[board.color] || 'bg-blue-500'}`} />
                    <span className="flex-1 text-sm truncate">{board.name}</span>
                    {board.id === currentBoardId && <Check size={14} className="text-blue-500 shrink-0" />}
                    <div className="hidden group-hover:flex gap-0.5 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); startEdit(board); }}
                        className={`p-1 rounded ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}>
                        <Pencil size={11} />
                      </button>
                      {boards.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(board.id); }}
                          className={`p-1 rounded ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}>
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            {isCreating ? (
              <div className="px-3 py-2.5 space-y-2">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Board name"
                  className={`w-full px-2.5 py-1.5 rounded-lg text-sm border
                    ${isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'}
                    focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  autoFocus onKeyDown={e => e.key === 'Enter' && handleCreate()} />
                <div className="flex gap-1">
                  {BOARD_COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      className={`w-5 h-5 rounded-full ${colorMap[c]} ${color === c ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`} />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={handleCreate}
                    className="flex-1 px-2 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium">Create</button>
                  <button onClick={() => { setIsCreating(false); setName(''); }}
                    className={`px-2 py-1 rounded-lg text-xs ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setIsCreating(true); setName(''); setColor('blue'); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors
                  ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                <Plus size={14} /> New workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
