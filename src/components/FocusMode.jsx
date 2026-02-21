import { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  X, Play, Pause, RotateCcw, Coffee, Flame,
  Circle, CircleDot, AlertCircle, Clock, CheckCircle2
} from 'lucide-react';
import { PRIORITIES, formatDuration, totalTimeMs } from '../utils/constants';

const WORK_SECS = 25 * 60;
const SHORT_BREAK_SECS = 5 * 60;
const LONG_BREAK_SECS = 15 * 60;
const LONG_BREAK_AFTER = 4;

const priorityIcons = { low: Circle, medium: CircleDot, high: AlertCircle, urgent: Flame };

export default function FocusMode({ task, onExit, onStartTimer, onStopTimer, activeTimerTaskId }) {
  const { isDark } = useTheme();
  const [phase, setPhase] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(WORK_SECS);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const intervalRef = useRef(null);
  const originalTitle = useRef(document.title);

  const isRunning = phase === 'work' || phase === 'break';
  const isWork = phase === 'work';
  const totalSecs = isWork ? WORK_SECS : (pomodoroCount > 0 && pomodoroCount % LONG_BREAK_AFTER === 0) ? LONG_BREAK_SECS : SHORT_BREAK_SECS;
  const progress = totalSecs > 0 ? ((totalSecs - timeLeft) / totalSecs) * 100 : 0;
  const PIcon = priorityIcons[task?.priority] || Circle;
  const accumulatedTime = totalTimeMs(task?.timeEntries);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const clearTick = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => {
    if (!isRunning) { clearTick(); return; }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTick();
          if (phase === 'work') {
            onStopTimer?.(task.id);
            const count = pomodoroCount + 1;
            setPomodoroCount(count);
            const breakSecs = count % LONG_BREAK_AFTER === 0 ? LONG_BREAK_SECS : SHORT_BREAK_SECS;
            setPhase('break');
            return breakSecs;
          } else {
            setPhase('idle');
            return WORK_SECS;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return clearTick;
  }, [phase, isRunning, clearTick, task?.id, onStopTimer, pomodoroCount]);

  useEffect(() => {
    if (isRunning) {
      const emoji = isWork ? '\uD83D\uDD12' : '\u2615';
      document.title = `${emoji} ${formatTimer(timeLeft)} - ${task?.title || 'Focus'}`;
    } else {
      document.title = originalTitle.current;
    }
    return () => { document.title = originalTitle.current; };
  }, [timeLeft, isRunning, isWork, task?.title]);

  const handleStart = () => {
    if (phase === 'idle') {
      setPhase('work');
      setTimeLeft(WORK_SECS);
      onStartTimer?.(task.id);
    }
  };

  const handlePause = () => {
    clearTick();
    if (phase === 'work') onStopTimer?.(task.id);
    setPhase('paused-' + phase);
  };

  const handleResume = () => {
    const prev = phase.replace('paused-', '');
    if (prev === 'work') onStartTimer?.(task.id);
    setPhase(prev);
  };

  const handleReset = () => {
    clearTick();
    if (phase === 'work' || phase === 'paused-work') onStopTimer?.(task.id);
    setPhase('idle');
    setTimeLeft(WORK_SECS);
  };

  const handleExit = () => {
    clearTick();
    if (phase === 'work') onStopTimer?.(task.id);
    document.title = originalTitle.current;
    onExit();
  };

  const isPaused = phase.startsWith('paused-');
  const showLongBreakHint = pomodoroCount > 0 && pomodoroCount % LONG_BREAK_AFTER === 0 && phase !== 'work';

  if (!task) return null;

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 py-8 transition-colors duration-300
      ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>

      <button onClick={handleExit}
        className={`absolute top-6 right-6 p-2.5 rounded-xl transition-colors
          ${isDark ? 'text-slate-500 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
        title="Exit Focus Mode">
        <X size={20} />
      </button>

      <div className="w-full max-w-sm text-center animate-fade-in">
        {/* Task info */}
        <div className="mb-8">
          <div className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full mb-3 font-medium
            ${isWork ? 'bg-red-500/20 text-red-400' : phase === 'break' ? 'bg-emerald-500/20 text-emerald-400'
              : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
            {isWork ? <Flame size={12} /> : phase === 'break' ? <Coffee size={12} /> : <Clock size={12} />}
            {isWork ? 'Deep Work' : phase === 'break' ? (showLongBreakHint ? 'Long Break' : 'Short Break') : 'Ready'}
          </div>
          <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{task.title}</h2>
          <div className={`flex items-center justify-center gap-2 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <span className="inline-flex items-center gap-1"><PIcon size={11} />{PRIORITIES[task.priority]?.label}</span>
            {accumulatedTime > 0 && <span className="inline-flex items-center gap-1"><Clock size={11} />{formatDuration(accumulatedTime)}</span>}
          </div>
        </div>

        {/* Timer circle */}
        <div className="relative w-56 h-56 mx-auto mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none"
              stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeWidth="6" />
            <circle cx="100" cy="100" r={radius} fill="none"
              stroke={isWork ? '#ef4444' : phase === 'break' ? '#10b981' : '#3b82f6'}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={strokeOffset}
              className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-5xl font-mono font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatTimer(timeLeft)}
            </span>
            <span className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {isWork ? 'Focus time' : phase === 'break' ? 'Break time' : 'Press start'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button onClick={handleReset}
            className={`p-3 rounded-xl transition-colors ${isDark ? 'text-slate-500 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}
            title="Reset">
            <RotateCcw size={20} />
          </button>

          {phase === 'idle' ? (
            <button onClick={handleStart}
              className="w-16 h-16 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center
                shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-95">
              <Play size={28} className="ml-1" />
            </button>
          ) : isPaused ? (
            <button onClick={handleResume}
              className="w-16 h-16 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center
                shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-95">
              <Play size={28} className="ml-1" />
            </button>
          ) : (
            <button onClick={handlePause}
              className={`w-16 h-16 rounded-2xl text-white flex items-center justify-center shadow-lg transition-all active:scale-95
                ${isWork ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}>
              <Pause size={28} />
            </button>
          )}

          <div className="w-[52px]" />
        </div>

        {/* Pomodoro dots */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {Array.from({ length: Math.max(LONG_BREAK_AFTER, pomodoroCount) }, (_, i) => (
            <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < pomodoroCount
              ? 'bg-red-500 scale-110' : isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-200 border border-slate-300'}`} />
          ))}
        </div>
        <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          {pomodoroCount} pomodoro{pomodoroCount !== 1 ? 's' : ''} completed
          {showLongBreakHint && ' — take a longer break!'}
        </p>

        {phase === 'break' && (
          <button onClick={() => { setPhase('idle'); setTimeLeft(WORK_SECS); }}
            className={`mt-4 text-xs px-4 py-2 rounded-lg transition-colors font-medium
              ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
            Skip break
          </button>
        )}

        {task.description && (
          <div className={`mt-8 p-4 rounded-xl text-left text-sm leading-relaxed
            ${isDark ? 'bg-slate-900 border border-slate-800 text-slate-400' : 'bg-white border border-slate-200 text-slate-500'}`}>
            {task.description}
          </div>
        )}
      </div>
    </div>
  );
}
