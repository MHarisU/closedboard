import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';

export default function ToastContainer() {
  const { isDark } = useTheme();
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };

  const colors = {
    success: isDark 
      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
      : 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error: isDark 
      ? 'bg-red-500/20 border-red-500/30 text-red-400' 
      : 'bg-red-50 border-red-200 text-red-700',
    info: isDark 
      ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' 
      : 'bg-blue-50 border-blue-200 text-blue-700'
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm
            animate-slide-in-right ${colors[toast.type]}`}
          onClick={() => removeToast(toast.id)}
        >
          <span className="text-lg">{icons[toast.type]}</span>
          <span className="text-sm font-medium flex-1">{toast.message}</span>
          <button 
            className="opacity-50 hover:opacity-100 transition-opacity text-sm"
            onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
