import { useState, useCallback, useRef } from 'react';

export interface UseMultiSelectReturn<T> {
  selectedIds: Set<string>;
  isSelectMode: boolean;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  selectAll: (items: T[]) => void;
  clearAll: () => void;
  toggleSelectMode: () => void;
  count: number;
}

export function useMultiSelect<T>(
  getId: (item: T) => string
): UseMultiSelectReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  // Stabilize getId to avoid selectAll recreating on every render when callers pass inline arrows
  const getIdRef = useRef(getId);
  getIdRef.current = getId;

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(
    (items: T[]) => setSelectedIds(new Set(items.map((i) => getIdRef.current(i)))),
    []
  );

  const clearAll = useCallback(() => setSelectedIds(new Set()), []);

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => !prev);
    // Clear selection when exiting select mode — separate setState call (not inside updater)
    setSelectedIds((prev) => {
      if (isSelectMode) return new Set();
      return prev;
    });
  }, [isSelectMode]);

  return {
    selectedIds,
    isSelectMode,
    isSelected,
    toggle,
    selectAll,
    clearAll,
    toggleSelectMode,
    count: selectedIds.size,
  };
}
