import { useEffect, useCallback } from 'react';

export type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export function useKeyboardShortcut(
  shortcut: KeyboardShortcut,
  callback: (event: KeyboardEvent) => void,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const { key, ctrl, meta, shift, alt } = shortcut;

      // Check modifiers
      const ctrlMatch = ctrl === undefined || event.ctrlKey === ctrl;
      const metaMatch = meta === undefined || event.metaKey === meta;
      const shiftMatch = shift === undefined || event.shiftKey === shift;
      const altMatch = alt === undefined || event.altKey === alt;

      // Check key
      const keyMatch = event.key.toLowerCase() === key.toLowerCase();

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        event.preventDefault();
        event.stopPropagation();
        callback(event);
      }
    },
    [shortcut, callback, enabled]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
}

/**
 * Hook for global keyboard shortcuts
 */
export function useGlobalShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Command/Ctrl + K
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        shortcuts.openCommandPalette?.();
      }

      // Command/Ctrl + /
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        shortcuts.focusSearch?.();
      }

      // Command/Ctrl + B
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        shortcuts.toggleSidebar?.();
      }

      // ESC
      if (event.key === 'Escape') {
        shortcuts.closeModal?.();
      }

      // Command/Ctrl + 1-9 for page navigation
      if ((event.metaKey || event.ctrlKey) && /^[1-9]$/.test(event.key)) {
        event.preventDefault();
        const pageIndex = parseInt(event.key) - 1;
        shortcuts[`goToPage${pageIndex}`]?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
