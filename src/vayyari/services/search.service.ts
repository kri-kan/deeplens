import { searchApiClient } from '../api/client';
import { MediaDto, SearchFilters } from '../types/search';
import { API_ROUTES } from '../constants/api-routes';
import { getIdentityApiUrl, getSearchApiUrl, getWhatsappProcessorUrl, getOtelEndpointUrl } from '@/utils/api-config';


/**
 * Service for interacting with the DeepLens Search API.
 * Encapsulates catalog search, media listing, and ingestion.
 */
class SearchService {
  /**
   * Lists catalog media with pagination and filtering.
   */
  async listMedia(filters: SearchFilters = {}): Promise<MediaDto[]> {
    const response = await searchApiClient.get<MediaDto[]>(API_ROUTES.CATALOG.MEDIA, {
      params: {
        page: filters.page || 1,
        pageSize: filters.pageSize || 50,
        type: filters.type,
        tenant: filters.tenant,
      },
      // In a real scenario, we might need a cache-control strategy here
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
    
    return response;
  }

  /**
   * Generates a fully qualified thumbnail URL for a given media ID.
   */
  getThumbnailUrl(mediaId: string, tenantId: string, spec: 'icon' | 'medium' | 'large' = 'medium'): string {
    const baseUrl = getSearchApiUrl();
    return `${baseUrl}${API_ROUTES.CATALOG.THUMBNAIL(mediaId)}?tenant=${tenantId}&spec=${spec}`;
  }

  /**
   * Toggles favorite status for a listing.
   */
  async favoriteListing(listingId: string, isFavorite: boolean = true): Promise<void> {
    await searchApiClient.post<void>(API_ROUTES.CATALOG.FAVORITE(listingId), null, {
      params: { isFavorite }
    });
  }
}

export const searchService = new SearchService();
export default searchService;
