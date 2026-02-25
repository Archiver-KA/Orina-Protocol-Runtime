import { useState, useCallback, useMemo } from 'react';
import { BulkSelectionState } from '@/types/bulk';

/**
 * Hook for managing bulk selection state
 */
export function useBulkSelection(totalItems: number = 0) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Toggle select mode
  const toggleSelectMode = useCallback(() => {
    setSelectMode(prev => !prev);
    if (selectMode) {
      // Clear selection when exiting select mode
      setSelectedIds(new Set());
    }
  }, [selectMode]);

  // Toggle single item
  const toggleItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Select all
  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Select range (shift+click)
  const selectRange = useCallback((startId: string, endId: string, allIds: string[]) => {
    const startIndex = allIds.indexOf(startId);
    const endIndex = allIds.indexOf(endId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      for (let i = start; i <= end; i++) {
        newSet.add(allIds[i]);
      }
      return newSet;
    });
  }, []);

  // Check if item is selected
  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  // Check if all items are selected
  const isAllSelected = useMemo(() => {
    return totalItems > 0 && selectedIds.size === totalItems;
  }, [selectedIds.size, totalItems]);

  // Check if some items are selected (for indeterminate state)
  const isSomeSelected = useMemo(() => {
    return selectedIds.size > 0 && selectedIds.size < totalItems;
  }, [selectedIds.size, totalItems]);

  // Selection count
  const selectedCount = useMemo(() => selectedIds.size, [selectedIds.size]);

  // Has selection
  const hasSelection = useMemo(() => selectedIds.size > 0, [selectedIds.size]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // State object
  const state: BulkSelectionState = useMemo(() => ({
    selectedIds,
    selectMode,
    totalItems,
  }), [selectedIds, selectMode, totalItems]);

  return {
    // State
    state,
    selectedIds,
    selectMode,
    selectedCount,
    hasSelection,
    isAllSelected,
    isSomeSelected,
    
    // Actions
    toggleSelectMode,
    toggleItem,
    selectAll,
    deselectAll,
    selectRange,
    isSelected,
    clearSelection,
  };
}
