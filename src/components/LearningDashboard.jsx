import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { GraduationCap, BookMarked, ExternalLink, ChevronDown } from 'lucide-react';
import { DEFAULT_TAGS, isLearningTask, getLearningTopics } from '../utils/constants';

export default function LearningDashboard({ tasks, onTagFilter, customTags }) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(true);

  const TAGS = (customTags && Object.keys(customTags).length > 0) ? customTags : DEFAULT_TAGS;
  const LEARNING_TOPICS = getLearningTopics(TAGS);

  const allTasks = Object.values(tasks);
  const learningTasks = allTasks.filter(t => isLearningTask(t, TAGS));

  if (learningTasks.length === 0) return null;

  const topicStats = LEARNING_TOPICS.map(topicId => {
    const topicTasks = learningTasks.filter(t => t.tags?.includes(topicId));
    const completed = topicTasks.filter(t => t.column === 'completed');
    const totalConcepts = topicTasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0);
    const completedConcepts = topicTasks.reduce((sum, t) => sum + (t.subtasks?.filter(s => s.done).length || 0), 0);
    const resources = topicTasks.flatMap(t => t.resources || []);
    return {
      id: topicId, tag: TAGS[topicId],
      total: topicTasks.length, completed: completed.length,
      inProgress: topicTasks.filter(t => t.column === 'inProgress').length,
      totalConcepts, completedConcepts, resources,
      progress: topicTasks.length > 0 ? Math.round((completed.length / topicTasks.length) * 100) : 0
    };
  }).filter(s => s.total > 0);

  const totalLearning = learningTasks.length;
  const completedLearning = learningTasks.filter(t => t.column === 'completed').length;
  const totalConcepts = learningTasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0);
  const completedConcepts = learningTasks.reduce((sum, t) => sum + (t.subtasks?.filter(s => s.done).length || 0), 0);
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
  const thisWeek = learningTasks.filter(t => t.completedAt && new Date(t.completedAt) > weekStart).length;

  return (
    <div className={`mb-6 rounded-2xl border overflow-hidden transition-all duration-300
      ${isDark ? 'bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20' : 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200'}`}>
      <button onClick={() => setExpanded(!expanded)}
        className={`w-full px-5 py-4 flex items-center justify-between transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-white/50'}`}>
        <div className="flex items-center gap-3">
          <GraduationCap size={24} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
          <div className="text-left">
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Learning Dashboard</h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {completedLearning}/{totalLearning} topics &middot; {completedConcepts}/{totalConcepts} concepts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
            {thisWeek} this week
          </span>
          <ChevronDown size={16} className={`transition-transform ${isDark ? 'text-slate-400' : 'text-slate-500'} ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {topicStats.map(topic => (
              <div key={topic.id} onClick={() => onTagFilter?.(topic.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200
                  ${isDark ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800' : 'bg-white/70 border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full text-white font-medium ${topic.tag.color}`}>{topic.tag.label}</span>
                  <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{topic.progress}%</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden mb-3 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <div className={`h-full transition-all duration-500 ${topic.tag.color}`} style={{ width: `${topic.progress}%` }} />
                </div>
                <div className={`grid grid-cols-2 gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <div><span className="block font-medium">{topic.completed}/{topic.total}</span><span>Tasks done</span></div>
                  <div><span className="block font-medium">{topic.completedConcepts}/{topic.totalConcepts}</span><span>Concepts</span></div>
                </div>
                {topic.resources.length > 0 && (
                  <div className={`mt-2 pt-2 border-t text-xs flex items-center gap-1 ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                    <BookMarked size={12} /> {topic.resources.length} resources
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-800/30' : 'bg-white/50'}`}>
            <div className="flex items-center gap-6 text-sm">
              <div className={isDark ? 'text-slate-400' : 'text-slate-600'}><span className="font-semibold text-emerald-500">{completedLearning}</span> completed</div>
              <div className={isDark ? 'text-slate-400' : 'text-slate-600'}><span className="font-semibold text-blue-500">{learningTasks.filter(t => t.column === 'inProgress').length}</span> in progress</div>
              <div className={isDark ? 'text-slate-400' : 'text-slate-600'}><span className="font-semibold text-slate-500">{learningTasks.filter(t => t.column === 'backlog').length}</span> planned</div>
            </div>
            <button onClick={() => onTagFilter?.('learning')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                ${isDark ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' : 'bg-violet-100 text-violet-600 hover:bg-violet-200'}`}>
              View all learning tasks &rarr;
            </button>
          </div>

          {topicStats.some(t => t.resources.length > 0) && (
            <div>
              <h4 className={`text-xs font-medium mb-2 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <BookMarked size={13} /> Recent Resources
              </h4>
              <div className="flex flex-wrap gap-2">
                {topicStats.flatMap(t => t.resources).slice(0, 5).map((resource, i) => (
                  <a key={i} href={resource.url} target="_blank" rel="noopener noreferrer"
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5
                      ${isDark ? 'bg-slate-800 text-blue-400 hover:bg-slate-700' : 'bg-white text-blue-600 hover:bg-slate-50 shadow-sm'}`}>
                    <ExternalLink size={11} /> {resource.title}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
