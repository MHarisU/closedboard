import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function StatsPanel({ tasks }) {
  const { isDark } = useTheme();
  
  const stats = useMemo(() => {
    const allTasks = Object.values(tasks);
    const completed = allTasks.filter(t => t.column === 'completed');
    const inProgress = allTasks.filter(t => t.column === 'inProgress');
    const backlog = allTasks.filter(t => t.column === 'backlog');
    
    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    
    const completedToday = completed.filter(t => t.completedAt && t.completedAt >= todayMs);
    
    // This week
    const weekAgo = todayMs - (7 * 24 * 60 * 60 * 1000);
    const completedThisWeek = completed.filter(t => t.completedAt && t.completedAt >= weekAgo);
    
    // Completion rate
    const totalCreated = allTasks.length;
    const completionRate = totalCreated > 0 ? Math.round((completed.length / totalCreated) * 100) : 0;
    
    // Streak calculation
    let streak = 0;
    const dayMs = 24 * 60 * 60 * 1000;
    let checkDate = todayMs;
    
    // Check if completed anything today first
    const hasCompletedToday = completedToday.length > 0;
    if (!hasCompletedToday) {
      // If nothing today, start checking from yesterday
      checkDate = todayMs - dayMs;
    }
    
    for (let i = 0; i < 365; i++) {
      const dayStart = checkDate - (i * dayMs);
      const dayEnd = dayStart + dayMs;
      const completedOnDay = completed.filter(t => 
        t.completedAt && t.completedAt >= dayStart && t.completedAt < dayEnd
      );
      
      if (completedOnDay.length > 0) {
        streak++;
      } else if (i > 0 || hasCompletedToday) {
        // Break streak if no completions (but don't break on day 0 if nothing today yet)
        break;
      }
    }
    
    return {
      total: allTasks.length,
      completed: completed.length,
      inProgress: inProgress.length,
      backlog: backlog.length,
      completedToday: completedToday.length,
      completedThisWeek: completedThisWeek.length,
      completionRate,
      streak
    };
  }, [tasks]);

  const StatCard = ({ icon, label, value, subtext, color }) => (
    <div className={`p-3 rounded-xl border transition-colors
      ${isDark 
        ? 'bg-slate-800/50 border-slate-700/50' 
        : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {label}
        </span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {value}
      </div>
      {subtext && (
        <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {subtext}
        </div>
      )}
    </div>
  );

  return (
    <div className={`rounded-2xl border p-4 mb-4 transition-colors
      ${isDark 
        ? 'bg-slate-900/50 border-slate-800' 
        : 'bg-white/50 border-slate-200 shadow-sm'}`}>
      <h3 className={`font-semibold text-sm mb-3 flex items-center gap-2
        ${isDark ? 'text-white' : 'text-slate-800'}`}>
        <span>📊</span> Stats
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard 
          icon="🔥" 
          label="Streak" 
          value={`${stats.streak} day${stats.streak !== 1 ? 's' : ''}`}
          color={stats.streak >= 7 
            ? 'text-orange-500' 
            : stats.streak >= 3 
              ? 'text-amber-500' 
              : isDark ? 'text-slate-300' : 'text-slate-700'}
        />
        <StatCard 
          icon="✅" 
          label="Today" 
          value={stats.completedToday}
          subtext="completed"
          color={isDark ? 'text-emerald-400' : 'text-emerald-600'}
        />
        <StatCard 
          icon="📅" 
          label="This Week" 
          value={stats.completedThisWeek}
          subtext="completed"
          color={isDark ? 'text-blue-400' : 'text-blue-600'}
        />
        <StatCard 
          icon="📈" 
          label="Rate" 
          value={`${stats.completionRate}%`}
          subtext={`${stats.completed}/${stats.total}`}
          color={stats.completionRate >= 70 
            ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
            : stats.completionRate >= 40 
              ? (isDark ? 'text-amber-400' : 'text-amber-600')
              : (isDark ? 'text-slate-400' : 'text-slate-500')}
        />
      </div>
      
      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            Overall Progress
          </span>
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            {stats.backlog} backlog • {stats.inProgress} active • {stats.completed} done
          </span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden flex
          ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
          <div 
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(stats.completed / Math.max(stats.total, 1)) * 100}%` }}
          />
          <div 
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${(stats.inProgress / Math.max(stats.total, 1)) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Streak motivation */}
      {stats.streak >= 3 && (
        <div className={`mt-3 text-center text-xs py-2 rounded-lg
          ${isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
          {stats.streak >= 30 ? '🏆 Legendary! 30+ day streak!' :
           stats.streak >= 14 ? '⭐ Amazing! 2 week streak!' :
           stats.streak >= 7 ? '🔥 On fire! 1 week streak!' :
           '💪 Keep it going!'}
        </div>
      )}
    </div>
  );
}
