import { searchApiClient } from '../../api/client';
import { MediaDto, SearchFilters, UploadImageResponse } from '../../types/search';

/**
 * Service for interacting with the DeepLens Search API.
 * Encapsulates catalog search, media listing, and ingestion.
 */
class SearchService {
  /**
   * Lists catalog media with pagination and filtering.
   */
  async listMedia(filters: SearchFilters = {}): Promise<MediaDto[]> {
    const response = await searchApiClient.get<MediaDto[]>('/catalog/media', {
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
  getThumbnailUrl(mediaId: string, tenantId: string): string {
    const baseUrl = process.env.EXPO_PUBLIC_SEARCH_API_URL!;
    return `${baseUrl}/catalog/media/${mediaId}/thumbnail?tenant=${tenantId}`;
  }

  /**
   * Toggles favorite status for a listing.
   */
  async favoriteListing(listingId: string, isFavorite: boolean = true): Promise<void> {
    await searchApiClient.post<void>(`/catalog/listings/${listingId}/favorite`, null, {
      params: { isFavorite }
    });
  }
}

export const searchService = new SearchService();
export default searchService;
