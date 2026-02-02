import { formatTime } from '../utils/constants';

export default function ActivityFeed({ history }) {
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
    switch (action) {
      case 'created': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'moved': return 'text-yellow-400';
      case 'updated': return 'text-purple-400';
      case 'deleted': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
      <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
        📜 Action History
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
          {history.length}
        </span>
      </h3>
      
      <div className="space-y-3 max-h-[300px] overflow-y-auto column-scroll">
        {history.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No activity yet</p>
        ) : (
          history.slice(0, 15).map((entry, index) => (
            <div 
              key={entry.id} 
              className={`flex items-start gap-3 text-sm animate-slide-in`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className={`text-lg ${getActionColor(entry.action)}`}>
                {getActionIcon(entry.action)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-slate-300 truncate">{entry.message}</p>
                <p className="text-xs text-slate-500">{formatTime(entry.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
