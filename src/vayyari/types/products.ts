/**
 * Shared domain types for the Product Management feature.
 * Used across productService.ts, product-list.tsx, create-product.tsx, and CategoryIcons.tsx.
 */

/**
 * A catalog entry returned by GET /api/products.
 * Represents a vendor product linked to a master product.
 */
export interface VendorProduct {
  id: string;
  masterProductId: string;
  title: string;
  vendorPrice: number;
  category?: string;
  exclusiveDescription?: string;
  productCode: string;
  media: MediaEntry[];
  createdAt?: string;
}

export interface MediaEntry {
  id: string;
  path: string;
  isDefault: boolean;
}

/**
 * Payload for creating a new vendor product (POST /api/products).
 * The `files` field carries native React Native file objects.
 */
export interface ProductIngestionRequest {
  title: string;
  description?: string;
  vendorPrice: number;
  category?: string;
  files?: ProductFilePayload[];
}

/**
 * Native file descriptor for React Native FormData uploads.
 */
export interface ProductFilePayload {
  uri: string;
  type: string;
  name: string;
}

/**
 * Supported product categories, mirroring the backend enum.
 * Add new values here and CategoryIcons.tsx will pick them up automatically.
 */
export type ProductCategory = 'all' | 'saree' | 'dress' | 'lehanga' | 'suit' | 'general';

/**
 * A registry entry describing a category for use in UI selectors.
 */
export interface CategoryDefinition {
  id: ProductCategory;
  label: string;
  /** Relative path to the SVG asset used by CategoryIcon. */
  assetPath: ReturnType<typeof require>;
}
