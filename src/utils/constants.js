export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const formatDuration = (ms) => {
  if (!ms || ms <= 0) return '0m';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const totalTimeMs = (entries) =>
  (entries || []).reduce((sum, e) => e.end ? sum + (e.end - e.start) : sum, 0);

export const formatDueDate = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const getDueDateStatus = (dueDate) => {
  if (!dueDate) return null;
  const diff = dueDate - Date.now();
  const days = diff / (24 * 60 * 60 * 1000);
  if (days < 0) return 'overdue';
  if (days < 3) return 'soon';
  return 'normal';
};

export const COLUMNS = {
  backlog: { id: 'backlog', label: 'Backlog', color: 'slate' },
  inProgress: { id: 'inProgress', label: 'In Progress', color: 'blue' },
  completed: { id: 'completed', label: 'Completed', color: 'green' }
};

export const PRIORITIES = {
  low: { label: 'Low', color: 'slate' },
  medium: { label: 'Medium', color: 'yellow' },
  high: { label: 'High', color: 'orange' },
  urgent: { label: 'Urgent', color: 'red' }
};

// Fallback tags if API is unreachable
export const DEFAULT_TAGS = {
  feature: { label: 'Feature', color: 'bg-purple-500' },
  bug: { label: 'Bug', color: 'bg-red-500' },
  improvement: { label: 'Improvement', color: 'bg-blue-500' },
  research: { label: 'Research', color: 'bg-cyan-500' },
  personal: { label: 'Personal', color: 'bg-pink-500' },
  work: { label: 'Work', color: 'bg-amber-500' },
  ai: { label: 'AI Task', color: 'bg-violet-500' },
  learning: { label: 'Learning', color: 'bg-gradient-to-r from-violet-500 to-purple-500', isLearning: true },
  'react-native': { label: 'React Native', color: 'bg-cyan-500', isLearningTopic: true },
  'aws-sst': { label: 'AWS SST', color: 'bg-orange-500', isLearningTopic: true },
  javascript: { label: 'JavaScript', color: 'bg-yellow-500', isLearningTopic: true }
};

export const BOARD_COLORS = [
  'blue', 'emerald', 'violet', 'amber', 'rose', 'cyan', 'orange', 'pink'
];

export const TAG_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-emerald-500', 'bg-cyan-500', 'bg-blue-500', 'bg-violet-500',
  'bg-purple-500', 'bg-pink-500', 'bg-slate-500'
];

export const isLearningTask = (task, tags) => {
  const tagMap = tags || DEFAULT_TAGS;
  return task.tags?.includes('learning') ||
    task.tags?.some(t => tagMap[t]?.isLearningTopic);
};

export const getTaskTopic = (task, tags) => {
  const tagMap = tags || DEFAULT_TAGS;
  return task.tags?.find(t => tagMap[t]?.isLearningTopic) || null;
};

export const getLearningTopics = (tags) => {
  const tagMap = tags || DEFAULT_TAGS;
  return Object.entries(tagMap).filter(([_, t]) => t.isLearningTopic).map(([id]) => id);
};
