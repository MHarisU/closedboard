import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts({
  onNewTask, onRefresh, onSearch, onCloseModal, isModalOpen,
  focusedTaskId, allVisibleTaskIds, onFocusTask, onEditFocused, onDeleteFocused,
  disabled = false
}) {
  const handleKeyDown = useCallback((e) => {
    if (disabled) return;

    const target = e.target;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (e.key === 'Escape') {
      if (focusedTaskId) {
        onFocusTask?.(null);
      } else {
        onCloseModal?.();
      }
      return;
    }

    if (isModalOpen || isInput) return;

    const key = e.key.toLowerCase();
    const ids = allVisibleTaskIds || [];

    switch (key) {
      case 'n':
        e.preventDefault();
        onNewTask?.();
        break;
      case 'r':
        if (!focusedTaskId) { e.preventDefault(); onRefresh?.(); }
        break;
      case '/':
        e.preventDefault();
        onSearch?.();
        break;
      case 'j':
      case 'arrowdown': {
        if (ids.length === 0) break;
        e.preventDefault();
        const cur = ids.indexOf(focusedTaskId);
        onFocusTask?.(ids[cur < ids.length - 1 ? cur + 1 : 0]);
        break;
      }
      case 'k':
      case 'arrowup': {
        if (ids.length === 0) break;
        e.preventDefault();
        const cur = ids.indexOf(focusedTaskId);
        onFocusTask?.(ids[cur > 0 ? cur - 1 : ids.length - 1]);
        break;
      }
      case 'enter':
        if (focusedTaskId) { e.preventDefault(); onEditFocused?.(); }
        break;
      case 'd':
        if (focusedTaskId) { e.preventDefault(); onDeleteFocused?.(); onFocusTask?.(null); }
        break;
    }
  }, [onNewTask, onRefresh, onSearch, onCloseModal, isModalOpen,
      focusedTaskId, allVisibleTaskIds, onFocusTask, onEditFocused, onDeleteFocused, disabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
