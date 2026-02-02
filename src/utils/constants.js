// Generate unique IDs
export const generateId = () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

// Initial demo data
export const getInitialData = () => ({
  tasks: {
    task_1: {
      id: 'task_1',
      title: 'Set up Piper TTS for voice replies',
      description: 'Install and configure local TTS for free voice notes',
      column: 'completed',
      priority: 'high',
      createdAt: Date.now() - 3600000,
      completedAt: Date.now() - 1800000,
      isAITask: true
    },
    task_2: {
      id: 'task_2',
      title: 'Update GitHub profile to match LinkedIn',
      description: 'Add Flipdish role, React Native skills, improve SEO',
      column: 'completed',
      priority: 'medium',
      createdAt: Date.now() - 7200000,
      completedAt: Date.now() - 3000000,
      isAITask: true
    },
    task_3: {
      id: 'task_3',
      title: 'Build ClosedBoard Kanban App',
      description: 'Full-stack Kanban board with React, Tailwind, drag & drop',
      column: 'inProgress',
      priority: 'urgent',
      createdAt: Date.now() - 600000,
      isAITask: true
    },
    task_4: {
      id: 'task_4',
      title: 'Explore AWS SST for serverless',
      description: 'Research SST framework for Rohail\'s learning goals',
      column: 'backlog',
      priority: 'medium',
      createdAt: Date.now() - 86400000,
      isAITask: false
    },
    task_5: {
      id: 'task_5',
      title: 'Set up model fallback chain',
      description: 'Configure Opus → Sonnet → Haiku → Groq failover',
      column: 'backlog',
      priority: 'low',
      createdAt: Date.now() - 172800000,
      isAITask: false
    }
  },
  history: [
    { id: 'h1', action: 'created', taskId: 'task_3', timestamp: Date.now() - 600000, message: 'Started building ClosedBoard Kanban App' },
    { id: 'h2', action: 'completed', taskId: 'task_1', timestamp: Date.now() - 1800000, message: 'Piper TTS is now working! Free voice notes enabled.' },
    { id: 'h3', action: 'completed', taskId: 'task_2', timestamp: Date.now() - 3000000, message: 'Profile updated with Flipdish role and new skills.' }
  ],
  columnOrder: ['backlog', 'inProgress', 'completed']
});

// LocalStorage helpers
export const saveToStorage = (data) => {
  localStorage.setItem('closedboard_data', JSON.stringify(data));
};

export const loadFromStorage = () => {
  const stored = localStorage.getItem('closedboard_data');
  return stored ? JSON.parse(stored) : null;
};
