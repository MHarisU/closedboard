import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Ghost, Archive, ArrowUp, X, TrendingUp, Calendar, ListChecks,
  Flame, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { fetchInsights } from '../utils/api';

const TYPE_CONFIG = {
  stale: { icon: Ghost, color: 'amber', label: 'Stale' },
  velocity: { icon: TrendingUp, color: 'blue', label: 'Velocity' },
  pattern: { icon: Calendar, color: 'violet', label: 'Pattern' },
  subtask_estimate: { icon: ListChecks, color: 'cyan', label: 'Estimate' },
  streak: { icon: Flame, color: 'emerald', label: 'Streak' }
};

export default function GhostTasks({ boardId, onMoveTask, onUpdateTask, connected }) {
  const { isDark } = useTheme();
  const [insights, setInsights] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('closedboard_dismissed_insights') || '[]'); }
    catch { return []; }
  });
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    const result = await fetchInsights(boardId);
    setInsights(result.insights || []);
    setLoading(false);
  }, [boardId, connected]);

  useEffect(() => { load(); }, [load]);

  const dismiss = (insight) => {
    const key = `${insight.type}_${insight.taskId || 'global'}_${boardId}`;
    const updated = [...dismissed, key];
    setDismissed(updated);
    localStorage.setItem('closedboard_dismissed_insights', JSON.stringify(updated));
  };

  const handleArchive = async (taskId) => {
    await onMoveTask(taskId, 'completed');
    dismiss({ type: 'stale', taskId });
    load();
  };

  const handleBumpPriority = async (taskId) => {
    await onUpdateTask(taskId, { priority: 'high' });
    dismiss({ type: 'stale', taskId });
    load();
  };

  const visible = insights.filter(i => {
    const key = `${i.type}_${i.taskId || 'global'}_${boardId}`;
    return !dismissed.includes(key);
  });

  if (visible.length === 0) return null;

  const colorMap = {
    amber: { bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50', border: isDark ? 'border-amber-500/20' : 'border-amber-200', text: isDark ? 'text-amber-400' : 'text-amber-700', icon: isDark ? 'text-amber-400' : 'text-amber-500' },
    blue: { bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50', border: isDark ? 'border-blue-500/20' : 'border-blue-200', text: isDark ? 'text-blue-400' : 'text-blue-700', icon: isDark ? 'text-blue-400' : 'text-blue-500' },
    violet: { bg: isDark ? 'bg-violet-500/10' : 'bg-violet-50', border: isDark ? 'border-violet-500/20' : 'border-violet-200', text: isDark ? 'text-violet-400' : 'text-violet-700', icon: isDark ? 'text-violet-400' : 'text-violet-500' },
    cyan: { bg: isDark ? 'bg-cyan-500/10' : 'bg-cyan-50', border: isDark ? 'border-cyan-500/20' : 'border-cyan-200', text: isDark ? 'text-cyan-400' : 'text-cyan-700', icon: isDark ? 'text-cyan-400' : 'text-cyan-500' },
    emerald: { bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50', border: isDark ? 'border-emerald-500/20' : 'border-emerald-200', text: isDark ? 'text-emerald-400' : 'text-emerald-700', icon: isDark ? 'text-emerald-400' : 'text-emerald-500' }
  };

  return (
    <div className={`mb-4 rounded-2xl border overflow-hidden transition-colors
      ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-slate-200'}`}>

      <button onClick={() => setCollapsed(!collapsed)}
        className={`w-full px-4 py-3 flex items-center justify-between text-sm font-medium transition-colors
          ${isDark ? 'text-slate-300 hover:bg-slate-800/50' : 'text-slate-700 hover:bg-slate-50'}`}>
        <span className="flex items-center gap-2">
          <Ghost size={16} className={isDark ? 'text-violet-400' : 'text-violet-500'} />
          Insights
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
            {visible.length}
          </span>
        </span>
        <div className="flex items-center gap-1.5">
          <RefreshCw size={13} className={`transition-transform ${loading ? 'animate-spin' : ''} ${isDark ? 'text-slate-600' : 'text-slate-400'}`}
            onClick={(e) => { e.stopPropagation(); load(); }} />
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-3 space-y-2">
          {visible.map((insight, i) => {
            const cfg = TYPE_CONFIG[insight.type] || TYPE_CONFIG.stale;
            const Icon = cfg.icon;
            const colors = colorMap[cfg.color];
            return (
              <div key={`${insight.type}_${insight.taskId || i}`}
                className={`flex items-start gap-3 p-3 rounded-xl border text-sm transition-colors
                  ${colors.bg} ${colors.border}`}>
                <Icon size={16} className={`shrink-0 mt-0.5 ${colors.icon}`} />
                <div className="flex-1 min-w-0">
                  <p className={colors.text}>{insight.message}</p>
                  {insight.type === 'stale' && (
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => handleArchive(insight.taskId)}
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors
                          ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
                        <Archive size={11} /> Archive
                      </button>
                      <button onClick={() => handleBumpPriority(insight.taskId)}
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors
                          ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
                        <ArrowUp size={11} /> Bump Priority
                      </button>
                    </div>
                  )}
                </div>
                <button onClick={() => dismiss(insight)}
                  className={`shrink-0 p-1 rounded-lg transition-colors ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500'}`}>
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
