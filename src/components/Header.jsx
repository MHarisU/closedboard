import { useState, useEffect } from 'react';

export default function Header({ onNewTask, onRefresh, connected, lastSync }) {
  const [syncText, setSyncText] = useState('');

  // Update sync time display
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
    <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔐</span>
            <div>
              <h1 className="text-xl font-bold text-slate-100">ClosedBoard</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                AI Assistant Task Tracker
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                {syncText && <span className="text-slate-500 ml-1">• {syncText}</span>}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 
                rounded-lg transition-colors active:scale-95"
              title="Refresh now"
            >
              🔄
            </button>
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
