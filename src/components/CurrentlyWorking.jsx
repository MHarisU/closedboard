export default function CurrentlyWorking({ tasks }) {
  if (tasks.length === 0) {
    return (
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="font-semibold text-slate-100 mb-2 flex items-center gap-2">
          🤖 ClosedBot Status
        </h3>
        <p className="text-sm text-slate-400">Currently idle. Waiting for tasks...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-900/30 to-slate-900 rounded-xl border border-blue-800/50 p-4">
      <h3 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
        <span className="animate-pulse-slow">🤖</span> 
        ClosedBot Working On
        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
          {tasks.length} active
        </span>
      </h3>
      
      <div className="space-y-2">
        {tasks.map(task => (
          <div 
            key={task.id}
            className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3"
          >
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <div className="flex-1">
              <p className="text-sm text-slate-200 font-medium">{task.title}</p>
              {task.description && (
                <p className="text-xs text-slate-400 truncate">{task.description}</p>
              )}
            </div>
            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
              In Progress
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
