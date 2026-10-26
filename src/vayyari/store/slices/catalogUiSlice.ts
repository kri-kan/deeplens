import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FilterState, DEFAULT_FILTER_STATE } from '@/components/utility/product/FilterDrawer';

export interface CatalogUiState {
  sessionToggledStarIds: string[];
  activeCategory: string;
  activeFilters: FilterState;
  searchQuery: string;
  catalogViewMode: 'grid' | 'ai_matrix';
}

const initialState: CatalogUiState = {
  sessionToggledStarIds: [],
  activeCategory: 'all',
  activeFilters: DEFAULT_FILTER_STATE,
  searchQuery: '',
  catalogViewMode: 'grid',
};

export const catalogUiSlice = createSlice({
  name: 'catalogUi',
  initialState,
  reducers: {
    markStarToggled: (state, action: PayloadAction<string>) => {
      if (!state.sessionToggledStarIds.includes(action.payload)) {
        state.sessionToggledStarIds.push(action.payload);
      }
    },
    clearSessionStars: (state) => {
      state.sessionToggledStarIds = [];
    },
    setActiveCategory: (state, action: PayloadAction<string>) => {
      state.activeCategory = action.payload;
      state.sessionToggledStarIds = [];
    },
    setActiveFilters: (state, action: PayloadAction<FilterState>) => {
      state.activeFilters = action.payload;
      state.sessionToggledStarIds = [];
      const primaryCat = action.payload.categories?.[0];
      if (primaryCat && primaryCat !== 'all') {
        state.activeCategory = primaryCat;
      }
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setCatalogViewMode: (state, action: PayloadAction<'grid' | 'ai_matrix'>) => {
      state.catalogViewMode = action.payload;
    },
    resetFilters: (state) => {
      state.activeFilters = DEFAULT_FILTER_STATE;
      state.sessionToggledStarIds = [];
    },
  },
});

export const {
  markStarToggled,
  clearSessionStars,
  setActiveCategory,
  setActiveFilters,
  setSearchQuery,
  setCatalogViewMode,
  resetFilters,
} = catalogUiSlice.actions;

export const catalogUiReducer = catalogUiSlice.reducer;
