import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { catalogApi } from './api/catalogApi';
import { catalogUiReducer } from './slices/catalogUiSlice';
import { catalogSelectionReducer } from './slices/catalogSelectionSlice';
import { telemetryApi } from './api/telemetryApi';
import { telemetryUiReducer } from './slices/telemetryUiSlice';

export const store = configureStore({
  reducer: {
    [catalogApi.reducerPath]: catalogApi.reducer,
    catalogUi: catalogUiReducer,
    catalogSelection: catalogSelectionReducer,
    [telemetryApi.reducerPath]: telemetryApi.reducer,
    telemetryUi: telemetryUiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore RTK Query internal non-serializable arguments if any
        ignoredActions: ['catalogApi/executeMutation/pending'],
      },
    }).concat(catalogApi.middleware, telemetryApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
