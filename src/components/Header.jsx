export default function Header({ onNewTask, onReset }) {
  return (
    <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔐</span>
            <div>
              <h1 className="text-xl font-bold text-slate-100">ClosedBoard</h1>
              <p className="text-xs text-slate-400">AI Assistant Task Tracker</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 
                rounded-lg transition-colors"
              title="Reset to demo data"
            >
              🔄 Reset
            </button>
            <button
              onClick={onNewTask}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                hover:bg-blue-500 transition-colors font-medium text-sm"
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
