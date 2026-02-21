import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  BarChart3, Flame, CheckCircle, Calendar, TrendingUp, Trophy, Star, Zap,
  AlertTriangle, Clock
} from 'lucide-react';
import { formatDuration, totalTimeMs } from '../utils/constants';

export default function StatsPanel({ tasks }) {
  const { isDark } = useTheme();

  const stats = useMemo(() => {
    const allTasks = Object.values(tasks);
    const completed = allTasks.filter(t => t.column === 'completed');
    const inProgress = allTasks.filter(t => t.column === 'inProgress');
    const backlog = allTasks.filter(t => t.column === 'backlog');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const completedToday = completed.filter(t => t.completedAt && t.completedAt >= todayMs);

    const weekAgo = todayMs - (7 * 24 * 60 * 60 * 1000);
    const completedThisWeek = completed.filter(t => t.completedAt && t.completedAt >= weekAgo);

    const totalCreated = allTasks.length;
    const completionRate = totalCreated > 0 ? Math.round((completed.length / totalCreated) * 100) : 0;

    let streak = 0;
    const dayMs = 24 * 60 * 60 * 1000;
    let checkDate = todayMs;
    const hasCompletedToday = completedToday.length > 0;
    if (!hasCompletedToday) checkDate = todayMs - dayMs;
    for (let i = 0; i < 365; i++) {
      const dayStart = checkDate - (i * dayMs);
      const dayEnd = dayStart + dayMs;
      if (completed.filter(t => t.completedAt && t.completedAt >= dayStart && t.completedAt < dayEnd).length > 0) streak++;
      else if (i > 0 || hasCompletedToday) break;
    }

    const now = Date.now();
    const overdue = allTasks.filter(t => t.dueDate && t.dueDate < now && t.column !== 'completed');

    let trackedTodayMs = 0;
    for (const task of allTasks) {
      for (const entry of (task.timeEntries || [])) {
        const start = entry.start;
        const end = entry.end || now;
        if (end > todayMs) {
          const effectiveStart = Math.max(start, todayMs);
          trackedTodayMs += end - effectiveStart;
        }
      }
    }

    return {
      total: allTasks.length, completed: completed.length,
      inProgress: inProgress.length, backlog: backlog.length,
      completedToday: completedToday.length, completedThisWeek: completedThisWeek.length,
      completionRate, streak, overdue: overdue.length,
      trackedToday: trackedTodayMs
    };
  }, [tasks]);

  const StatCard = ({ icon, label, value, subtext, color }) => (
    <div className={`p-3 rounded-xl border transition-colors ${isDark ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{icon}</span>
        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {subtext && <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{subtext}</div>}
    </div>
  );

  const streakMessage = () => {
    if (stats.streak >= 30) return <><Trophy size={14} className="inline mr-1" />Legendary! 30+ day streak!</>;
    if (stats.streak >= 14) return <><Star size={14} className="inline mr-1" />Amazing! 2 week streak!</>;
    if (stats.streak >= 7) return <><Flame size={14} className="inline mr-1" />On fire! 1 week streak!</>;
    return <><Zap size={14} className="inline mr-1" />Keep it going!</>;
  };

  return (
    <div className={`rounded-2xl border p-4 mb-4 transition-colors ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-slate-200 shadow-sm'}`}>
      <h3 className={`font-semibold text-sm mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
        <BarChart3 size={16} className={isDark ? 'text-slate-400' : 'text-slate-500'} /> Stats
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={<Flame size={16} />} label="Streak"
          value={`${stats.streak}d`}
          color={stats.streak >= 7 ? 'text-orange-500' : stats.streak >= 3 ? 'text-amber-500' : isDark ? 'text-slate-300' : 'text-slate-700'} />
        <StatCard icon={<CheckCircle size={16} />} label="Today" value={stats.completedToday} subtext="completed"
          color={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
        <StatCard icon={<Calendar size={16} />} label="This Week" value={stats.completedThisWeek} subtext="completed"
          color={isDark ? 'text-blue-400' : 'text-blue-600'} />
        <StatCard icon={<TrendingUp size={16} />} label="Rate" value={`${stats.completionRate}%`}
          subtext={`${stats.completed}/${stats.total}`}
          color={stats.completionRate >= 70 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : stats.completionRate >= 40 ? (isDark ? 'text-amber-400' : 'text-amber-600') : (isDark ? 'text-slate-400' : 'text-slate-500')} />
        <StatCard icon={<AlertTriangle size={16} />} label="Overdue" value={stats.overdue}
          subtext={stats.overdue > 0 ? 'need attention' : 'all clear'}
          color={stats.overdue > 0 ? 'text-red-500' : isDark ? 'text-emerald-400' : 'text-emerald-600'} />
        <StatCard icon={<Clock size={16} />} label="Tracked Today"
          value={formatDuration(stats.trackedToday)}
          color={isDark ? 'text-violet-400' : 'text-violet-600'} />
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Overall Progress</span>
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
            {stats.backlog} backlog &middot; {stats.inProgress} active &middot; {stats.completed} done
          </span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden flex ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(stats.completed / Math.max(stats.total, 1)) * 100}%` }} />
          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(stats.inProgress / Math.max(stats.total, 1)) * 100}%` }} />
        </div>
      </div>

      {stats.streak >= 3 && (
        <div className={`mt-3 text-center text-xs py-2 rounded-lg ${isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}>
          {streakMessage()}
        </div>
      )}
    </div>
  );
}
