import { useState, useCallback } from 'react';

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
    (items: T[]) => setSelectedIds(new Set(items.map(getId))),
    [getId]
  );

  const clearAll = useCallback(() => setSelectedIds(new Set()), []);

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

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
