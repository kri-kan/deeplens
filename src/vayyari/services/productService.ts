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
      formData.append('Category', request.category);
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

  getThumbnailUrl(mediaId: string, spec: 'icon' | 'medium' | 'large' = 'medium'): string {
    const baseUrl = process.env.EXPO_PUBLIC_SEARCH_API_URL!;
    return `${baseUrl}${API_ROUTES.CATALOG.THUMBNAIL(mediaId)}?spec=${spec}`;
  }
}

export const productService = new ProductService();
