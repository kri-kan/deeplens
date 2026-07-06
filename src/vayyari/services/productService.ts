import { productMgmtApiClient } from '../api/client';
import { API_ROUTES } from '../constants/api-routes';
import type { VendorProduct, ProductIngestionRequest, ProductShareLog, RecordShareRequest, GenerateShareDescriptionResponse } from '../types/products';
import { getIdentityApiUrl, getSearchApiUrl, getWhatsappProcessorUrl, getOtelEndpointUrl } from '@/utils/api-config';


class ProductService {
  async createProduct(request: ProductIngestionRequest): Promise<VendorProduct> {
    const formData = new FormData();
    formData.append('title', request.title);

    if (request.description) {
      formData.append('description', request.description);
    }
    formData.append('vendorPrice', request.vendorPrice.toString());

    if (request.category) {
      formData.append('category', request.category);
    }

    if (request.sourcePostId) {
      formData.append('sourcePostId', request.sourcePostId);
    }
    
    if (request.sourcePostIds && request.sourcePostIds.length > 0) {
      request.sourcePostIds.forEach(id => {
        formData.append('sourcePostIds', id);
      });
    }

    if (request.files && request.files.length > 0) {
      request.files.forEach((file) => {
        // In React Native, FormData.append(name, { uri, type, name }) is the standard for files.
        formData.append('files', file as any);
      });
    }

    return productMgmtApiClient.postFormData<VendorProduct>(API_ROUTES.PRODUCT_CATALOG.CREATE, formData);
  }

  async mergeProducts(
    targetMasterId: string,
    sourceProductIds: string[],
    isVendorProductIds = false
  ): Promise<void> {
    return productMgmtApiClient.post<void>(API_ROUTES.PRODUCT_CATALOG.MERGE, {
      targetMasterId,
      sourceProductIds,
      isVendorProductIds,
    });
  }

  async getProducts(skip = 0, take = 20): Promise<VendorProduct[]> {
    return productMgmtApiClient.get<VendorProduct[]>(API_ROUTES.PRODUCT_CATALOG.LIST, {
      params: { skip, take },
    });
  }

  async getCatalog(params: {
    category?: string;
    sortBy?: string;
    skip?: number;
    take?: number;
    query?: string;
    startDate?: string;
    endDate?: string;
    fabrics?: string[];
    vendorNames?: string[];
    minPrice?: number;
    maxPrice?: number;
  }): Promise<{ products: VendorProduct[], totalCount: number }> {
    // Serialize arrays as repeated query params
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.append('category', params.category);
    if (params.sortBy) searchParams.append('sortBy', params.sortBy);
    if (params.skip !== undefined) searchParams.append('skip', String(params.skip));
    if (params.take !== undefined) searchParams.append('take', String(params.take));
    if (params.query) searchParams.append('query', params.query);
    if (params.startDate) searchParams.append('startDate', params.startDate);
    if (params.endDate) searchParams.append('endDate', params.endDate);
    if (params.minPrice !== undefined) searchParams.append('minPrice', String(params.minPrice));
    if (params.maxPrice !== undefined) searchParams.append('maxPrice', String(params.maxPrice));
    params.fabrics?.forEach(f => searchParams.append('fabrics', f));
    params.vendorNames?.forEach(v => searchParams.append('vendorNames', v));
    return productMgmtApiClient.get<{ products: VendorProduct[], totalCount: number }>(
      API_ROUTES.PRODUCT_CATALOG.LIST + '/catalog?' + searchParams.toString()
    );
  }

  async getFilterOptions(): Promise<{ fabrics: string[]; vendors: string[]; minPrice: number; maxPrice: number }> {
    return productMgmtApiClient.get(API_ROUTES.PRODUCT_CATALOG.LIST + '/catalog/filter-options');
  }

  async getProductById(id: string): Promise<VendorProduct> {
    return productMgmtApiClient.get<VendorProduct>(API_ROUTES.PRODUCT_CATALOG.GET_BY_ID(id));
  }

  async deleteProduct(productId: string): Promise<void> {
    return productMgmtApiClient.delete(`${API_ROUTES.PRODUCT_CATALOG.LIST}/${productId}`);
  }

  async starMedia(productId: string, mediaId: string): Promise<void> {
    return productMgmtApiClient.post(`${API_ROUTES.PRODUCT_CATALOG.LIST}/${productId}/star/${mediaId}`);
  }

  async toggleStar(productId: string, isStarred: boolean): Promise<void> {
    return productMgmtApiClient.patch(`/api/v1/catalog/products/${productId}/star`, { isStarred });
  }

  async setDefaultMedia(productId: string, mediaId: string): Promise<void> {
    return productMgmtApiClient.patch(`/api/v1/catalog/products/${productId}/media/${mediaId}/set-default`);
  }

  async reorderMedia(productId: string, mediaIds: string[]): Promise<void> {
    return productMgmtApiClient.post(`${API_ROUTES.PRODUCT_CATALOG.LIST}/${productId}/reorder`, mediaIds);
  }

  getThumbnailUrl(mediaId: string, spec: 'icon' | 'medium' | 'large' = 'medium'): string {
    const baseUrl = getSearchApiUrl();
    if (!baseUrl) {
      console.warn('EXPO_PUBLIC_SEARCH_API_URL is not defined');
      return `https://via.placeholder.com/150?text=No+API+URL`;
    }
    return `${baseUrl}${API_ROUTES.CATALOG.THUMBNAIL(mediaId)}?spec=${spec}`;
  }

  getThumbnailUrlByPath(path: string, spec: 'icon' | 'medium' | 'large' = 'medium'): string {
    const baseUrl = getSearchApiUrl();
    if (!baseUrl) return `https://via.placeholder.com/150`;
    return `${baseUrl}/api/v1/catalog/media/thumbnail-by-path?path=${encodeURIComponent(path)}&spec=${spec}`;
  }

  getMediaUrlByPath(path: string): string {
    const baseUrl = getSearchApiUrl();
    if (!baseUrl) return `https://via.placeholder.com/150`;
    return `${baseUrl}/api/v1/catalog/media/serve?path=${encodeURIComponent(path)}`;
  }

  getRawMediaUrl(mediaId: string): string {
    const baseUrl = getSearchApiUrl();
    if (!baseUrl) return '';
    return `${baseUrl}/api/v1/catalog/media/${mediaId}/raw`;
  }

  async getInstagramLinks(postId: string): Promise<any[]> {
    return productMgmtApiClient.get<any[]>(API_ROUTES.INSTAGRAM.LINKS(postId));
  }

  async unlinkInstagramPost(postId: string, productId: string): Promise<void> {
    return productMgmtApiClient.delete(API_ROUTES.INSTAGRAM.UNLINK(postId, productId));
  }

  async fetchMergeCandidates(skip: number = 0, take: number = 100): Promise<any[]> {
    return productMgmtApiClient.get<any[]>('/api/v1/whatsapp/products/merge-candidates', {
      params: { skip, take }
    });
  }

  async mergeProductsSimilarity(productAId: string, productBId: string, candidateId: string): Promise<any> {
    return productMgmtApiClient.post<any>('/api/v1/whatsapp/products/merge', {
      productAId,
      productBId,
      candidateId
    });
  }

  async dismissMergeCandidate(candidateId: string): Promise<any> {
    return productMgmtApiClient.post<any>('/api/v1/whatsapp/products/dismiss-merge', {
      candidateId
    });
  }

  async fetchSimilarMatches(productId: string): Promise<any[]> {
    return productMgmtApiClient.get<any[]>(`/api/v1/whatsapp/products/${productId}/similar-matches`);
  }

  async triggerSimilarityScan(productId: string): Promise<any> {
    return productMgmtApiClient.post<any>(`/api/v1/whatsapp/products/${productId}/trigger-similarity-scan`, {});
  }

  async fetchTodayWhatsAppProducts(): Promise<any[]> {
    return productMgmtApiClient.get<any[]>('/api/v1/whatsapp/products/today');
  }

  async fetchFailedEnrichments(): Promise<any[]> {
    return productMgmtApiClient.get<any[]>('/api/v1/whatsapp/products/failed-enrichments');
  }

  async retryEnrichment(groupId: string): Promise<any> {
    return productMgmtApiClient.post<any>(`/api/v1/whatsapp/products/retry-enrichment/${encodeURIComponent(groupId)}`);
  }

  async changeCategory(productId: string, categorySlug: string): Promise<any> {
    return productMgmtApiClient.post<any>(`/api/v1/products/${productId}/category`, { categorySlug });
  }

  async reevaluateProducts(productIds: string[]): Promise<any> {
    return productMgmtApiClient.post<any>(`/api/v1/whatsapp/products/reevaluate`, { productIds });
  }

  async recordShare(productId: string, request: RecordShareRequest): Promise<ProductShareLog> {
    return productMgmtApiClient.post<ProductShareLog>(`/api/v1/products/${productId}/shares`, request);
  }

  async generateShareDescription(productId: string): Promise<GenerateShareDescriptionResponse> {
    return productMgmtApiClient.post<GenerateShareDescriptionResponse>(`/api/v1/products/${productId}/generate-share-description`, {});
  }
}

export const productService = new ProductService();
