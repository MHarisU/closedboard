import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export default function Header({ 
  onNewTask, 
  onRefresh, 
  connected, 
  lastSync, 
  searchQuery, 
  onSearchChange, 
  showArchive, 
  onToggleArchive,
  showStats,
  onToggleStats,
  searchInputRef
}) {
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
        setSyncText('Just now');
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
    <header className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors duration-300
      ${isDark 
        ? 'bg-slate-900/80 border-slate-700/50' 
        : 'bg-white/80 border-slate-200'}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl
              ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
              🔐
            </div>
            <div>
              <h1 className={`text-lg font-bold tracking-tight
                ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ClosedBoard
              </h1>
              <div className="flex items-center gap-2 text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Task Tracker
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${connected 
                  ? 'bg-emerald-500 animate-pulse-soft' 
                  : 'bg-amber-500'}`} />
                {syncText && (
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>
                    {syncText}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                🔍
              </span>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search... (press /)"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm transition-all duration-200
                  ${isDark 
                    ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500 focus:bg-slate-800 focus:border-slate-600' 
                    : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-slate-300'}
                  border focus:ring-2 focus:ring-blue-500/20`}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm
                    ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {/* Stats Toggle */}
            <button
              onClick={onToggleStats}
              className={`p-2.5 rounded-xl text-sm transition-all duration-200
                ${showStats 
                  ? isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-600'
                  : isDark 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
              title={showStats ? 'Hide Stats' : 'Show Stats'}
            >
              📊
            </button>

            {/* Archive */}
            <button
              onClick={onToggleArchive}
              className={`p-2.5 rounded-xl text-sm transition-all duration-200
                ${showArchive 
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                  : isDark 
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
              title={showArchive ? 'Hide Archive' : 'Show Archive'}
            >
              📦
            </button>

            {/* Theme */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl text-sm transition-all duration-200
                ${isDark 
                  ? 'text-slate-400 hover:text-yellow-400 hover:bg-slate-800' 
                  : 'text-slate-500 hover:text-amber-500 hover:bg-slate-100'}`}
              title={isDark ? 'Light Mode' : 'Dark Mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              className={`p-2.5 rounded-xl text-sm transition-all duration-200
                ${isDark 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
              title="Refresh (R)"
            >
              🔄
            </button>

            {/* New Task */}
            <button
              onClick={onNewTask}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl 
                hover:bg-blue-600 transition-all duration-200 font-medium text-sm
                shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95"
              title="New Task (N)"
            >
              <span>＋</span>
              <span className="hidden sm:inline">New</span>
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="mt-3 sm:hidden">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm transition-all duration-200
                ${isDark 
                  ? 'bg-slate-800/50 border-slate-700 text-white placeholder-slate-500' 
                  : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400'}
                border focus:ring-2 focus:ring-blue-500/20`}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
