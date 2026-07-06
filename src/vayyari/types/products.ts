/**
 * Shared domain types for the Product Management feature.
 * Used across productService.ts, product-list.tsx, create-product.tsx, and CategoryIcons.tsx.
 */

/**
 * A catalog entry returned by GET /api/products.
 * Represents a vendor product linked to a master product.
 */
/**
 * Major media buckets mirroring MediaCategory from backend.
 */
export type MediaCategory = 'Unknown' | 'Product' | 'Order' | 'Archive' | 'Profile' | 'System' | 'Instagram';

/**
 * Supported product sub-categories, mirroring ProductSubCategory from backend.
 * Add new values here and CategoryIcons.tsx will pick them up automatically.
 */
export type ProductCategory = 'all' | 'Saree' | 'Dress' | 'Lehanga' | 'Kids' | 'General';

export interface VendorListing {
  id: string;
  vendorId: string;
  vendorName?: string;
  price: number;
  currency: string;
  isPlusShipping?: boolean;
  description?: string;
  isActive: boolean;
  updatedAt?: string;
  sourceGroupId?: string;
  /** JID of the WhatsApp chat this specific listing came from */
  sourceJid?: string;
}

export interface VendorProduct {
  id: string;
  masterProductId: string;
  title: string;
  vendorPrice: number;
  category?: string;
  description?: string;
  exclusiveDescription?: string;
  fabric?: string;
  stitchType?: string;
  workHeaviness?: string;
  productCode: string;
  media: MediaEntry[];
  mediaMap?: Record<string, string>;
  createdAt?: string;
  /** WhatsApp group JID this product was sourced from (e.g. 120363160307172096@g.us) */
  sourceJid?: string;
  /** WhatsApp message group ID used to view the original chat messages */
  sourceGroupId?: string;
  /** All vendor listings for this product */
  listings?: VendorListing[];
  /** Number of active vendor listings for this product */
  listingCount?: number;
  /** Whether this product is starred by the user */
  isStarred?: boolean;
}

export interface MediaEntry {
  id: string;
  storagePath: string;
  color?: string;
  isDefault: boolean;
  /** 1 = image, 2 = video */
  mediaType?: number;
}

/**
 * Payload for creating a new vendor product (POST /api/products).
 * Mirrors the backend ProductIngestionDto / ProductRequest.
 */
export interface ProductIngestionRequest {
  title: string;
  description?: string;
  vendorPrice: number;
  category?: MediaCategory;
  subCategory?: ProductCategory;
  retention?: string;
  fabric?: string;
  stitchType?: string;
  workHeaviness?: string;
  color?: string;
  tags?: string[];
  sourcePostId?: string;
  sourcePostIds?: string[];
  files?: ProductFilePayload[]; // Used for FormData upload
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
 * A registry entry describing a category for use in UI selectors.
 */
export interface CategoryDefinition {
  id: ProductCategory;
  label: string;
  /** Relative path to the SVG asset used by CategoryIcon. */
  assetPath: any;
}

export interface ProductShareLog {
  id: string;
  productId: string;
  platform: string;
  sharedAt: string;
  descriptionUsed?: string;
}

export interface RecordShareRequest {
  platform: string;
  descriptionUsed: string | null;
}

export interface GenerateShareDescriptionResponse {
  description: string;
}
