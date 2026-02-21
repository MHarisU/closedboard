import { useState, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Lightbulb, ArrowRight, Check } from 'lucide-react';

export default function QuickCapture({ onCapture }) {
  const { isDark } = useTheme();
  const [value, setValue] = useState('');
  const [flash, setFlash] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = async () => {
    const text = value.trim();
    if (!text) return;
    setValue('');
    setFlash(true);
    setTimeout(() => setFlash(false), 1500);
    await onCapture({
      title: text, description: '', column: 'backlog',
      priority: 'medium', tags: [], subtasks: [], resources: [],
      isAITask: false, dueDate: null
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className={`pointer-events-auto rounded-2xl border shadow-xl transition-all duration-300
          ${isDark ? 'bg-slate-900/95 border-slate-700/50 backdrop-blur-xl' : 'bg-white/95 border-slate-200 backdrop-blur-xl shadow-slate-200/50'}
          ${flash ? isDark ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-emerald-400 shadow-emerald-200/50' : ''}`}>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className={`shrink-0 transition-colors ${flash
              ? 'text-emerald-500' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {flash ? <Check size={18} /> : <Lightbulb size={18} />}
            </div>
            <input ref={inputRef} type="text" value={value} onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Quick capture — type and press Enter"
              className={`flex-1 bg-transparent text-sm outline-none placeholder-slate-400
                ${isDark ? 'text-white' : 'text-slate-900'}`} />
            {value.trim() && (
              <button onClick={handleSubmit}
                className="shrink-0 p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors active:scale-95">
                <ArrowRight size={16} />
              </button>
            )}
            {flash && (
              <span className={`text-xs font-medium shrink-0 animate-fade-in
                ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                Created!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
