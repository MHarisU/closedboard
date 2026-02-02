import { useTheme } from '../contexts/ThemeContext';
import { formatTime } from '../utils/constants';

export default function ActivityFeed({ history }) {
  const { isDark } = useTheme();

  const getActionIcon = (action) => {
    switch (action) {
      case 'created': return '➕';
      case 'completed': return '✅';
      case 'moved': return '📦';
      case 'updated': return '✏️';
      case 'deleted': return '🗑️';
      default: return '📌';
    }
  };

  const getActionColor = (action) => {
    const colors = {
      created: isDark ? 'text-blue-400' : 'text-blue-600',
      completed: isDark ? 'text-emerald-400' : 'text-emerald-600',
      moved: isDark ? 'text-amber-400' : 'text-amber-600',
      updated: isDark ? 'text-violet-400' : 'text-violet-600',
      deleted: isDark ? 'text-red-400' : 'text-red-600',
    };
    return colors[action] || (isDark ? 'text-slate-400' : 'text-slate-500');
  };

  return (
    <div className={`rounded-2xl border p-4 transition-colors duration-300
      ${isDark 
        ? 'bg-slate-900/50 border-slate-800' 
        : 'bg-white/50 border-slate-200 shadow-sm'}`}>
      <h3 className={`font-semibold mb-4 flex items-center gap-2
        ${isDark ? 'text-white' : 'text-slate-800'}`}>
        <span className="text-base">📜</span>
        Activity
        <span className={`text-xs px-2 py-0.5 rounded-full
          ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
          {history.length}
        </span>
      </h3>
      
      <div className="space-y-2.5 max-h-[280px] overflow-y-auto column-scroll">
        {history.length === 0 ? (
          <p className={`text-sm text-center py-8
            ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            No activity yet
          </p>
        ) : (
          history.slice(0, 15).map((entry, index) => (
            <div 
              key={entry.id} 
              className={`flex items-start gap-3 text-sm p-2 -mx-2 rounded-xl transition-colors
                ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <span className={`text-base ${getActionColor(entry.action)}`}>
                {getActionIcon(entry.action)}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {entry.message}
                </p>
                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {formatTime(entry.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
