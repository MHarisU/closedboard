export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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

export const TAGS = {
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
  'javascript': { label: 'JavaScript', color: 'bg-yellow-500', isLearningTopic: true }
};

export const LEARNING_TOPICS = ['react-native', 'aws-sst', 'javascript'];

export const getLearningTags = () =>
  Object.entries(TAGS)
    .filter(([_, tag]) => tag.isLearning || tag.isLearningTopic)
    .map(([id, tag]) => ({ id, ...tag }));

export const isLearningTask = (task) =>
  task.tags?.includes('learning') ||
  task.tags?.some(tag => TAGS[tag]?.isLearningTopic);

export const getTaskTopic = (task) =>
  task.tags?.find(tag => TAGS[tag]?.isLearningTopic) || null;
