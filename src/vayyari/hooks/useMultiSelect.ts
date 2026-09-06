import { useState, useRef, useCallback, useEffect } from 'react';
import { BackHandler } from 'react-native';

export interface UseMultiSelectOptions<T = string> {
  items?: { id: T }[];
  onSelectionChange?: (selectedIds: Set<T>) => void;
  enableHardwareBack?: boolean;
}

export function useMultiSelect<T = string>(options: UseMultiSelectOptions<T> = {}) {
  const { items = [], onSelectionChange, enableHardwareBack = true } = options;

  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());
  const [isSelectionActive, setIsSelectionActive] = useState(false);
  const lastAnchorIdRef = useRef<T | null>(null);

  const selectionMode = isSelectionActive || selectedIds.size > 0;
  const isAllSelected = items.length > 0 && selectedIds.size >= items.length;

  const toggleSelect = useCallback((id: T) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      lastAnchorIdRef.current = id;
      onSelectionChange?.(next);
      return next;
    });
  }, [onSelectionChange]);

  const selectRange = useCallback((targetId: T) => {
    if (!lastAnchorIdRef.current || items.length === 0) {
      toggleSelect(targetId);
      return;
    }

    const anchorIndex = items.findIndex((item) => item.id === lastAnchorIdRef.current);
    const targetIndex = items.findIndex((item) => item.id === targetId);

    if (anchorIndex === -1 || targetIndex === -1) {
      toggleSelect(targetId);
      return;
    }

    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (let i = start; i <= end; i++) {
        next.add(items[i].id);
      }
      lastAnchorIdRef.current = targetId;
      onSelectionChange?.(next);
      return next;
    });
  }, [items, toggleSelect, onSelectionChange]);

  const selectAll = useCallback(() => {
    const all = new Set<T>(items.map((it) => it.id));
    setSelectedIds(all);
    onSelectionChange?.(all);
  }, [items, onSelectionChange]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionActive(false);
    lastAnchorIdRef.current = null;
    onSelectionChange?.(new Set());
  }, [onSelectionChange]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      clearSelection();
    } else {
      selectAll();
    }
  }, [isAllSelected, clearSelection, selectAll]);

  const enterSelectionMode = useCallback(() => {
    setIsSelectionActive(true);
  }, []);

  const exitSelectionMode = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const toggleSelectionMode = useCallback(() => {
    if (selectionMode) {
      exitSelectionMode();
    } else {
      enterSelectionMode();
    }
  }, [selectionMode, exitSelectionMode, enterSelectionMode]);

  // BackHandler for Android
  useEffect(() => {
    if (!enableHardwareBack) return;
    const onBackPress = () => {
      if (selectionMode) {
        exitSelectionMode();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [enableHardwareBack, selectionMode, exitSelectionMode]);

  return {
    selectedIds,
    selectionMode,
    isSelectionActive,
    isAllSelected,
    selectedCount: selectedIds.size,
    totalCount: items.length,
    toggleSelect,
    selectRange,
    selectAll,
    clearSelection,
    toggleSelectAll,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectionMode,
    setSelectedIds,
  };
}
