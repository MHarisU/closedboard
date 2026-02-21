import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  X, Lock, Unlock, CheckCircle2, ArrowRight, GitBranch,
  Circle, CircleDot, AlertCircle, Flame
} from 'lucide-react';
import { isTaskBlocked } from '../utils/constants';

const priorityIcons = { low: Circle, medium: CircleDot, high: AlertCircle, urgent: Flame };

export default function DependencyGraph({ isOpen, onClose, tasks }) {
  const { isDark } = useTheme();

  const chains = useMemo(() => {
    const allTasks = tasks || {};
    const withDeps = Object.values(allTasks).filter(t =>
      (t.blockedBy && t.blockedBy.length > 0) ||
      Object.values(allTasks).some(other => other.blockedBy?.includes(t.id))
    );

    const roots = new Set();
    const children = {};

    for (const t of withDeps) {
      const blockers = (t.blockedBy || []).filter(bid => allTasks[bid]);
      if (blockers.length === 0) {
        roots.add(t.id);
      } else {
        for (const bid of blockers) {
          if (!children[bid]) children[bid] = new Set();
          children[bid].add(t.id);
          roots.add(bid);
        }
      }
    }

    for (const id of roots) {
      for (const [, kids] of Object.entries(children)) {
        if (kids.has(id)) { roots.delete(id); break; }
      }
    }

    const buildTree = (id, visited = new Set()) => {
      if (visited.has(id)) return null;
      visited.add(id);
      const task = allTasks[id];
      if (!task) return null;
      const kids = children[id] ? [...children[id]].map(cid => buildTree(cid, visited)).filter(Boolean) : [];
      return { task, children: kids };
    };

    const realRoots = new Set();
    for (const id of Object.keys(allTasks)) {
      const hasParent = Object.values(children).some(kids => kids.has(id));
      if (!hasParent && children[id]) realRoots.add(id);
    }
    for (const t of withDeps) {
      if ((t.blockedBy || []).length > 0) {
        for (const bid of t.blockedBy) {
          if (allTasks[bid] && !Object.values(children).some(kids => kids.has(bid))) {
            realRoots.add(bid);
          }
        }
      }
    }

    return [...realRoots].map(id => buildTree(id)).filter(Boolean);
  }, [tasks]);

  if (!isOpen) return null;

  const hasDeps = chains.length > 0;

  const TaskNode = ({ node, depth = 0 }) => {
    const { task, children: kids } = node;
    const blocked = isTaskBlocked(task, tasks);
    const done = task.column === 'completed';
    const PIcon = priorityIcons[task.priority] || Circle;

    return (
      <div className={depth > 0 ? 'ml-6 mt-1.5' : 'mt-1.5'}>
        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm transition-colors
          ${done
            ? isDark ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : blocked
              ? isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              : isDark ? 'bg-slate-800/50 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
          {done ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
            : blocked ? <Lock size={14} className="text-amber-500 shrink-0" />
            : <Unlock size={14} className="text-blue-500 shrink-0" />}
          <span className={`flex-1 truncate ${done ? 'line-through opacity-60' : ''}`}>{task.title}</span>
          <PIcon size={12} className="shrink-0 opacity-50" />
        </div>
        {depth > 0 && (
          <div className={`ml-[-12px] mt-[-10px] mb-[-2px] w-3 h-3 border-l-2 border-b-2 rounded-bl-lg
            ${isDark ? 'border-slate-700' : 'border-slate-300'}`} />
        )}
        {kids.map(kid => (
          <div key={kid.task.id} className="relative">
            <div className={`absolute left-2 top-0 bottom-1/2 w-px
              ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
            <div className="flex items-start gap-0">
              <div className={`mt-[18px] w-4 border-t shrink-0
                ${isDark ? 'border-slate-700' : 'border-slate-300'}`} />
              <div className="flex-1">
                <div className={`flex items-center gap-1 text-[10px] mb-0.5 mt-1
                  ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                  <ArrowRight size={9} /> blocks
                </div>
                <TaskNode node={kid} depth={depth + 1} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl animate-slide-in max-h-[80vh] overflow-hidden
        ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}>

        <div className={`px-5 py-4 border-b flex items-center justify-between
          ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <h2 className={`text-lg font-semibold flex items-center gap-2
            ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <GitBranch size={18} /> Dependencies
          </h2>
          <button onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors
              ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[calc(80vh-70px)]">
          {hasDeps ? (
            <div className="space-y-4">
              {chains.map(chain => (
                <div key={chain.task.id} className={`p-3 rounded-xl border
                  ${isDark ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <TaskNode node={chain} />
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <GitBranch size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No dependencies yet</p>
              <p className="text-xs mt-1">Add blockers to tasks via the edit modal</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
