// Format timestamp
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

// Column configurations
export const COLUMNS = {
  backlog: { id: 'backlog', title: '📋 Backlog', color: 'slate' },
  inProgress: { id: 'inProgress', title: '🚀 In Progress', color: 'blue' },
  completed: { id: 'completed', title: '✅ Completed', color: 'green' }
};

// Priority configurations
export const PRIORITIES = {
  low: { label: 'Low', color: 'slate', icon: '○' },
  medium: { label: 'Medium', color: 'yellow', icon: '◐' },
  high: { label: 'High', color: 'orange', icon: '●' },
  urgent: { label: 'Urgent', color: 'red', icon: '🔥' }
};

// Tag configurations
export const TAGS = {
  feature: { label: 'Feature', color: 'bg-purple-500' },
  bug: { label: 'Bug', color: 'bg-red-500' },
  improvement: { label: 'Improvement', color: 'bg-blue-500' },
  research: { label: 'Research', color: 'bg-cyan-500' },
  personal: { label: 'Personal', color: 'bg-pink-500' },
  work: { label: 'Work', color: 'bg-amber-500' },
  learning: { label: 'Learning', color: 'bg-green-500' },
  ai: { label: 'AI Task', color: 'bg-violet-500' }
};
