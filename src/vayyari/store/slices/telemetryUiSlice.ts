import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TelemetryUiState {
  selectedPlatform: 'all' | 'pwa' | 'android' | 'web' | 'ios';
  searchQuery: string;
  selectedDeviceId: string | null;
  isAutoRefresh: boolean;
  activeActivityDays: number;
}

const initialState: TelemetryUiState = {
  selectedPlatform: 'all',
  searchQuery: '',
  selectedDeviceId: null,
  isAutoRefresh: true,
  activeActivityDays: 30,
};

export const telemetryUiSlice = createSlice({
  name: 'telemetryUi',
  initialState,
  reducers: {
    setSelectedPlatform: (state, action: PayloadAction<TelemetryUiState['selectedPlatform']>) => {
      state.selectedPlatform = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSelectedDeviceId: (state, action: PayloadAction<string | null>) => {
      state.selectedDeviceId = action.payload;
    },
    toggleAutoRefresh: (state) => {
      state.isAutoRefresh = !state.isAutoRefresh;
    },
    setAutoRefresh: (state, action: PayloadAction<boolean>) => {
      state.isAutoRefresh = action.payload;
    },
    setActiveActivityDays: (state, action: PayloadAction<number>) => {
      state.activeActivityDays = action.payload;
    },
    resetTelemetryFilters: (state) => {
      state.selectedPlatform = 'all';
      state.searchQuery = '';
      state.selectedDeviceId = null;
    },
  },
});

export const {
  setSelectedPlatform,
  setSearchQuery,
  setSelectedDeviceId,
  toggleAutoRefresh,
  setAutoRefresh,
  setActiveActivityDays,
  resetTelemetryFilters,
} = telemetryUiSlice.actions;

export const telemetryUiReducer = telemetryUiSlice.reducer;
