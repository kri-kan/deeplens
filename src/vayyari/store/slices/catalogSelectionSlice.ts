import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CatalogSelectionState {
  selectedIds: string[];
  selectionMode: boolean;
}

const initialState: CatalogSelectionState = {
  selectedIds: [],
  selectionMode: false,
};

export const catalogSelectionSlice = createSlice({
  name: 'catalogSelection',
  initialState,
  reducers: {
    toggleSelect: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const idx = state.selectedIds.indexOf(id);
      if (idx >= 0) {
        state.selectedIds.splice(idx, 1);
        if (state.selectedIds.length === 0) {
          state.selectionMode = false;
        }
      } else {
        state.selectedIds.push(id);
        state.selectionMode = true;
      }
    },
    selectRange: (
      state,
      action: PayloadAction<{ targetId: string; orderedIds: string[] }>
    ) => {
      const { targetId, orderedIds } = action.payload;
      if (state.selectedIds.length === 0) {
        state.selectedIds = [targetId];
        state.selectionMode = true;
        return;
      }
      const lastSelectedId = state.selectedIds[state.selectedIds.length - 1];
      const startIdx = orderedIds.indexOf(lastSelectedId);
      const endIdx = orderedIds.indexOf(targetId);

      if (startIdx === -1 || endIdx === -1) {
        if (!state.selectedIds.includes(targetId)) {
          state.selectedIds.push(targetId);
        }
        state.selectionMode = true;
        return;
      }

      const low = Math.min(startIdx, endIdx);
      const high = Math.max(startIdx, endIdx);
      const range = orderedIds.slice(low, high + 1);

      const nextSet = new Set(state.selectedIds);
      range.forEach((id) => nextSet.add(id));
      state.selectedIds = Array.from(nextSet);
      state.selectionMode = true;
    },
    toggleSelectAll: (state, action: PayloadAction<string[]>) => {
      const allIds = action.payload;
      if (state.selectedIds.length >= allIds.length && allIds.length > 0) {
        state.selectedIds = [];
        state.selectionMode = false;
      } else {
        state.selectedIds = [...allIds];
        state.selectionMode = true;
      }
    },
    clearSelection: (state) => {
      state.selectedIds = [];
      state.selectionMode = false;
    },
    setSelectionMode: (state, action: PayloadAction<boolean>) => {
      state.selectionMode = action.payload;
      if (!action.payload) {
        state.selectedIds = [];
      }
    },
  },
});

export const {
  toggleSelect,
  selectRange,
  toggleSelectAll,
  clearSelection,
  setSelectionMode,
} = catalogSelectionSlice.actions;

export const catalogSelectionReducer = catalogSelectionSlice.reducer;
