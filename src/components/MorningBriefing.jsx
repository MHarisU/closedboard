import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Sun, CheckCircle2, Flame, Rocket, BookOpen,
  AlertTriangle, Clock, ArrowRight, Zap, CalendarClock,
  Circle, CircleDot, AlertCircle, Target
} from 'lucide-react';
import { formatDueDate, formatDuration, totalTimeMs, isLearningTask, getLearningTopics } from '../utils/constants';

const DISMISSAL_KEY = 'closedboard_briefing_dismissed';

export function shouldShowBriefing() {
  const hour = new Date().getHours();
  if (hour >= 10) return false;

  const dismissed = localStorage.getItem(DISMISSAL_KEY);
  if (dismissed === new Date().toDateString()) return false;

  return true;
}

export function dismissBriefing() {
  localStorage.setItem(DISMISSAL_KEY, new Date().toDateString());
}

const priorityIcons = { low: Circle, medium: CircleDot, high: AlertCircle, urgent: Flame };
const priorityWeight = { urgent: 0, high: 1, medium: 2, low: 3 };

export default function MorningBriefing({ tasks, customTags, history, onDismiss }) {
  const { isDark } = useTheme();

  const briefing = useMemo(() => {
    const allTasks = Object.values(tasks || {});
    const now = Date.now();

    // Yesterday's boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const yesterdayMs = todayMs - 86400000;

    // --- Yesterday's completed tasks ---
    const yesterdayCompleted = allTasks
      .filter(t => t.completedAt && t.completedAt >= yesterdayMs && t.completedAt < todayMs)
      .sort((a, b) => a.completedAt - b.completedAt);

    // Also check history for completed actions yesterday (catches tasks that were completed then moved)
    const yesterdayFromHistory = (history || [])
      .filter(h => h.action === 'completed' && h.timestamp >= yesterdayMs && h.timestamp < todayMs)
      .map(h => {
        const task = allTasks.find(t => t.id === h.taskId);
        return task ? task.title : h.message.replace(/^Completed:\s*"?|"?$/g, '');
      });

    const completedTitles = new Set();
    const yesterdayItems = [];
    for (const t of yesterdayCompleted) {
      if (!completedTitles.has(t.title)) { completedTitles.add(t.title); yesterdayItems.push(t.title); }
    }
    for (const title of yesterdayFromHistory) {
      if (!completedTitles.has(title)) { completedTitles.add(title); yesterdayItems.push(title); }
    }

    // --- Active tasks ---
    const active = allTasks.filter(t => t.column !== 'completed');

    // Overdue tasks
    const overdue = active
      .filter(t => t.dueDate && t.dueDate < now)
      .sort((a, b) => a.dueDate - b.dueDate);

    // Urgent tasks (not already in overdue)
    const overdueIds = new Set(overdue.map(t => t.id));
    const urgent = active
      .filter(t => t.priority === 'urgent' && !overdueIds.has(t.id))
      .sort((a, b) => (a.dueDate || Infinity) - (b.dueDate || Infinity));

    // High-priority in-progress
    const urgentIds = new Set(urgent.map(t => t.id));
    const highInProgress = active
      .filter(t => t.column === 'inProgress' && t.priority === 'high' && !overdueIds.has(t.id) && !urgentIds.has(t.id));

    // Learning progress
    const LEARNING_TOPICS = getLearningTopics(customTags);
    const learningProgress = LEARNING_TOPICS.map(topicId => {
      const tagged = allTasks.filter(t => t.tags?.includes(topicId));
      const completed = tagged.filter(t => t.column === 'completed').length;
      const total = tagged.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      const label = customTags?.[topicId]?.label || topicId;
      return { topicId, label, completed, total, pct };
    }).filter(lp => lp.total > 0);

    // Active learning tasks for focus list
    const focusedIds = new Set([...overdueIds, ...urgentIds, ...highInProgress.map(t => t.id)]);
    const learningTasks = active
      .filter(t => isLearningTask(t, customTags) && !focusedIds.has(t.id))
      .sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority])
      .slice(0, 3);

    // --- Focus order ---
    const focusList = [
      ...overdue.map(t => ({ ...t, reason: 'overdue' })),
      ...urgent.map(t => ({ ...t, reason: 'urgent' })),
      ...highInProgress.map(t => ({ ...t, reason: 'in-progress' })),
      ...learningTasks.map(t => ({ ...t, reason: 'learning' })),
    ].slice(0, 7);

    // --- Today's tracked time ---
    let trackedTodayMs = 0;
    for (const task of allTasks) {
      for (const entry of (task.timeEntries || [])) {
        const end = entry.end || now;
        if (end > todayMs) {
          trackedTodayMs += end - Math.max(entry.start, todayMs);
        }
      }
    }

    return {
      yesterdayItems,
      overdue,
      urgent,
      active,
      focusList,
      learningProgress,
      trackedTodayMs,
      totalActive: active.length,
      urgentCount: overdue.length + urgent.length,
    };
  }, [tasks, customTags, history]);

  const reasonIcon = (reason) => {
    switch (reason) {
      case 'overdue': return <Flame size={14} className="text-red-500" />;
      case 'urgent': return <Zap size={14} className="text-amber-500" />;
      case 'in-progress': return <Rocket size={14} className="text-blue-500" />;
      case 'learning': return <BookOpen size={14} className="text-violet-500" />;
      default: return <Circle size={14} />;
    }
  };

  const reasonLabel = (reason) => {
    switch (reason) {
      case 'overdue': return 'overdue';
      case 'urgent': return 'urgent';
      case 'in-progress': return 'high priority';
      case 'learning': return 'learning';
      default: return '';
    }
  };

  const formatOverdueSince = (dueDate) => {
    const days = Math.floor((Date.now() - dueDate) / 86400000);
    if (days === 0) return 'since today';
    if (days === 1) return 'since yesterday';
    const d = new Date(dueDate);
    return `since ${d.toLocaleDateString('en-US', { weekday: 'long' })}`;
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Good night';
    if (hour < 12) return 'Good morning';
    return 'Good afternoon';
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex items-center justify-center px-4 py-8
      ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden animate-fade-in
        ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>

        {/* Header with gradient */}
        <div className={`px-6 pt-8 pb-6 ${isDark
          ? 'bg-gradient-to-br from-blue-600/20 via-violet-600/10 to-transparent'
          : 'bg-gradient-to-br from-blue-50 via-violet-50 to-transparent'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center
              ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
              <Sun size={24} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {greeting()}, Rohail.
              </h1>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Here&apos;s your daily briefing
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-5">

          {/* Yesterday's completed */}
          {briefing.yesterdayItems.length > 0 && (
            <section>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5
                ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <CheckCircle2 size={12} /> Yesterday you completed
              </h3>
              <div className="space-y-1.5">
                {briefing.yesterdayItems.slice(0, 5).map((title, i) => (
                  <div key={i} className={`flex items-center gap-2.5 text-sm py-1.5 px-3 rounded-lg
                    ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span className="truncate">{title}</span>
                  </div>
                ))}
                {briefing.yesterdayItems.length > 5 && (
                  <p className={`text-xs pl-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    +{briefing.yesterdayItems.length - 5} more
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Today's overview */}
          <section>
            <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5
              ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <Target size={12} /> Today you have
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                <div className={`text-2xl font-bold ${briefing.urgentCount > 0
                  ? 'text-red-500' : isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {briefing.urgentCount}
                </div>
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {briefing.urgentCount > 0 ? 'urgent / overdue' : 'all clear'}
                </div>
              </div>
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                <div className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                  {briefing.totalActive}
                </div>
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>active tasks</div>
              </div>
            </div>

            {/* Overdue detail */}
            {briefing.overdue.length > 0 && (
              <div className={`mt-2 flex items-center gap-2 text-xs py-1.5 px-3 rounded-lg
                ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
                <AlertTriangle size={12} />
                <span>{briefing.overdue.length} task{briefing.overdue.length > 1 ? 's' : ''} overdue</span>
              </div>
            )}

            {/* Tracked time from yesterday */}
            {briefing.trackedTodayMs > 0 && (
              <div className={`mt-2 flex items-center gap-2 text-xs py-1.5 px-3 rounded-lg
                ${isDark ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-50 text-violet-600'}`}>
                <Clock size={12} />
                <span>{formatDuration(briefing.trackedTodayMs)} tracked so far today</span>
              </div>
            )}
          </section>

          {/* Learning progress */}
          {briefing.learningProgress.length > 0 && (
            <section>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5
                ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <BookOpen size={12} /> Learning progress
              </h3>
              <div className="space-y-2">
                {briefing.learningProgress.map(lp => (
                  <div key={lp.topicId} className={`px-3 py-2 rounded-lg
                    ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {lp.label}
                      </span>
                      <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {lp.pct}%
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${lp.pct}%` }} />
                    </div>
                    <div className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {lp.completed}/{lp.total} tasks complete
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Focus order */}
          {briefing.focusList.length > 0 && (
            <section>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5
                ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                <CalendarClock size={12} /> Suggested focus order
              </h3>
              <div className="space-y-1.5">
                {briefing.focusList.map((task, i) => {
                  const PIcon = priorityIcons[task.priority] || Circle;
                  return (
                    <div key={task.id} className={`flex items-center gap-3 text-sm py-2.5 px-3 rounded-xl border transition-colors
                      ${isDark ? 'bg-slate-800/50 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                        ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {reasonIcon(task.reason)}
                          <span className={`font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {task.title}
                          </span>
                        </div>
                        <div className={`text-[11px] flex items-center gap-2 mt-0.5
                          ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          <span className="flex items-center gap-1">
                            <PIcon size={10} />
                            {task.priority}
                          </span>
                          <span>{reasonLabel(task.reason)}</span>
                          {task.reason === 'overdue' && task.dueDate && (
                            <span className="text-red-400">{formatOverdueSince(task.dueDate)}</span>
                          )}
                          {task.reason !== 'overdue' && task.dueDate && (
                            <span>due {formatDueDate(task.dueDate)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Empty state — nothing to do */}
          {briefing.focusList.length === 0 && briefing.totalActive === 0 && (
            <div className={`text-center py-6 rounded-xl border
              ${isDark ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
              <CheckCircle2 size={32} className={`mx-auto mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Your board is clear!
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Time to plan something new.
              </p>
            </div>
          )}

          {/* Start my day button */}
          <button onClick={onDismiss}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl
              bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500
              text-white font-semibold text-sm transition-all duration-200 shadow-lg
              hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]">
            Start my day
            <ArrowRight size={16} />
          </button>

          {/* Skip hint */}
          <p className={`text-center text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            Briefing appears before 10 AM daily. Resets each morning.
          </p>
        </div>
      </div>
    </div>
  );
}
