import { useTheme } from '../contexts/ThemeContext';

export default function CurrentlyWorking({ tasks }) {
  const { isDark } = useTheme();
  
  if (tasks.length === 0) return null;
  
  return (
    <div className={`rounded-2xl border p-4 mb-4 transition-colors duration-300
      ${isDark 
        ? 'bg-gradient-to-r from-blue-500/10 to-violet-500/10 border-blue-500/20' 
        : 'bg-gradient-to-r from-blue-50 to-violet-50 border-blue-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg animate-pulse">🤖</span>
        <h3 className={`text-sm font-semibold
          ${isDark ? 'text-white' : 'text-slate-800'}`}>
          ClosedBot is working on
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {tasks.map(task => (
          <div 
            key={task.id}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
              ${isDark 
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                : 'bg-blue-100 text-blue-700 border border-blue-200'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {task.title}
          </div>
        ))}
      </div>
    </div>
  );
}
