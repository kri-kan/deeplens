import { useState, useCallback, useEffect } from 'react';
import { searchService } from '../services/deepLens/search.service';
import { MediaDto, SearchFilters } from '../types/search';
import { ApiException } from '../types/api';
import { wrapInSpan } from '../utils/telemetry';

/**
 * Hook for consuming the Search service within components.
 * Handles state management and provides telemetry for user search interactions.
 */
export const useSearch = (initialFilters: SearchFilters = {}) => {
  const [data, setData] = useState<MediaDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);

  const fetchResults = useCallback(async (currentFilters: SearchFilters) => {
    setLoading(true);
    setError(null);

    // Business-level span wrapping for telemetry
    return wrapInSpan('Hook useSearch: fetchResults', async () => {
      try {
        const results = await searchService.listMedia(currentFilters);
        setData(results);
      } catch (err) {
        const message = err instanceof ApiException 
          ? err.error.message 
          : 'Failed to fetch search results';
        setError(message);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  // Update results when filters change
  useEffect(() => {
    fetchResults(filters);
  }, [filters, fetchResults]);

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const refresh = () => {
    fetchResults(filters);
  };

  return {
    data,
    loading,
    error,
    filters,
    updateFilters,
    refresh,
    getThumbnail: searchService.getThumbnailUrl
  };
};

export default useSearch;
