import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function Header({ onNewTask, onRefresh, connected, lastSync, searchQuery, onSearchChange, showArchive, onToggleArchive }) {
  const { isDark, toggleTheme } = useTheme();
  const [syncText, setSyncText] = useState('');

  useEffect(() => {
    const updateSyncText = () => {
      if (!lastSync) {
        setSyncText('');
        return;
      }
      const diff = Date.now() - lastSync;
      if (diff < 5000) {
        setSyncText('Just synced');
      } else if (diff < 60000) {
        setSyncText(`${Math.floor(diff / 1000)}s ago`);
      } else {
        setSyncText(`${Math.floor(diff / 60000)}m ago`);
      }
    };

    updateSyncText();
    const interval = setInterval(updateSyncText, 5000);
    return () => clearInterval(interval);
  }, [lastSync]);

  return (
    <header className="bg-slate-900/80 dark:bg-slate-900/80 bg-white/80 backdrop-blur-sm border-b border-slate-800 dark:border-slate-800 border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔐</span>
            <div>
              <h1 className="text-xl font-bold text-slate-100 dark:text-slate-100 text-slate-900">ClosedBoard</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                AI Assistant Task Tracker
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                {syncText && <span className="text-slate-500 ml-1">• {syncText}</span>}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 dark:bg-slate-800/50 bg-slate-100 
                  border border-slate-700 dark:border-slate-700 border-slate-300 rounded-lg 
                  text-slate-100 dark:text-slate-100 text-slate-900 placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Archive Toggle */}
            <button
              onClick={onToggleArchive}
              className={`px-3 py-2 text-sm rounded-lg transition-colors active:scale-95
                ${showArchive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title={showArchive ? 'Hide Archive' : 'Show Archive'}
            >
              📦
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 
                rounded-lg transition-colors active:scale-95"
              title={isDark ? 'Light Mode' : 'Dark Mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 
                rounded-lg transition-colors active:scale-95"
              title="Refresh now"
            >
              🔄
            </button>

            {/* New Task */}
            <button
              onClick={onNewTask}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                hover:bg-blue-500 transition-colors font-medium text-sm active:scale-95"
            >
              <span>➕</span>
              <span className="hidden sm:inline">New Task</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
