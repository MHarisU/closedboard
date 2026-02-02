import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts({ 
  onNewTask, 
  onRefresh, 
  onSearch, 
  onCloseModal,
  isModalOpen 
}) {
  const handleKeyDown = useCallback((e) => {
    // Don't trigger if typing in input/textarea
    const target = e.target;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    
    // Escape always works
    if (e.key === 'Escape') {
      onCloseModal?.();
      return;
    }

    // Don't trigger shortcuts when modal is open or typing
    if (isModalOpen || isInput) return;

    // Keyboard shortcuts
    switch (e.key.toLowerCase()) {
      case 'n':
        e.preventDefault();
        onNewTask?.();
        break;
      case 'r':
        e.preventDefault();
        onRefresh?.();
        break;
      case '/':
        e.preventDefault();
        onSearch?.();
        break;
    }
  }, [onNewTask, onRefresh, onSearch, onCloseModal, isModalOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
