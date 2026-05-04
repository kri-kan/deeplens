import { productMgmtApiClient } from '../api/client';
import { API_ROUTES } from '../constants/api-routes';
import type { VendorProduct, ProductIngestionRequest } from '../types/products';

class ProductService {
  async createProduct(request: ProductIngestionRequest): Promise<VendorProduct> {
    const formData = new FormData();
    formData.append('Title', request.title);

    if (request.description) {
      formData.append('Description', request.description);
    }
    formData.append('VendorPrice', request.vendorPrice.toString());

    if (request.category) {
      formData.append('CategorySlug', request.category);
    }

    if (request.sourcePostId) {
      formData.append('SourcePostId', request.sourcePostId);
    }
    
    if (request.sourcePostIds && request.sourcePostIds.length > 0) {
      request.sourcePostIds.forEach(id => {
        formData.append('SourcePostIds', id);
      });
    }

    if (request.files && request.files.length > 0) {
      request.files.forEach((file) => {
        // In React Native, FormData.append(name, { uri, type, name }) is the standard for files.
        formData.append('Files', file as any);
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

  async getCatalog(params: { category?: string; sortBy?: string; skip?: number; take?: number }): Promise<{ products: VendorProduct[], totalCount: number }> {
    return productMgmtApiClient.get<{ products: VendorProduct[], totalCount: number }>(API_ROUTES.PRODUCT_CATALOG.LIST + '/catalog', {
      params,
    });
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

  async reorderMedia(productId: string, mediaIds: string[]): Promise<void> {
    return productMgmtApiClient.post(`${API_ROUTES.PRODUCT_CATALOG.LIST}/${productId}/reorder`, mediaIds);
  }

  getThumbnailUrl(mediaId: string, spec: 'icon' | 'medium' | 'large' = 'medium'): string {
    const baseUrl = process.env.EXPO_PUBLIC_SEARCH_API_URL!;
    if (!baseUrl) {
      console.warn('EXPO_PUBLIC_SEARCH_API_URL is not defined');
      return `https://via.placeholder.com/150?text=No+API+URL`;
    }
    return `${baseUrl}${API_ROUTES.CATALOG.THUMBNAIL(mediaId)}?spec=${spec}`;
  }

  getThumbnailUrlByPath(path: string, spec: 'icon' | 'medium' | 'large' = 'medium'): string {
    const baseUrl = process.env.EXPO_PUBLIC_SEARCH_API_URL!;
    if (!baseUrl) return `https://via.placeholder.com/150`;
    return `${baseUrl}/api/v1/catalog/media/thumbnail-by-path?path=${encodeURIComponent(path)}&spec=${spec}`;
  }

  getMediaUrlByPath(path: string): string {
    const baseUrl = process.env.EXPO_PUBLIC_SEARCH_API_URL!;
    if (!baseUrl) return `https://via.placeholder.com/150`;
    return `${baseUrl}/api/v1/catalog/media/serve?path=${encodeURIComponent(path)}`;
  }
}

export const productService = new ProductService();
