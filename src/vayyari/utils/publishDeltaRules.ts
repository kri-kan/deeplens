/**
 * Media Delta Allocation & Publish Updates Queue Rules (ADO #1341)
 *
 * Enforces:
 * 1. Delta Detection: is_published === true AND (media_updated_at > store_publish_updated_at OR mediaCount > syncedMediaCount)
 * 2. Visual Media Delta Badge: "+N new photos"
 * 3. Publish Updates Queue Filtering
 * 4. Allocation of newly merged photos:
 *    - Existing color group
 *    - Brand new color group (enforcing mandatory initial stock quantity > 0)
 *    - Universal shared group photos pool (isCommon: true, zero MinIO duplication)
 */

export interface ProductDeltaCheckable {
  id?: string;
  isPublished?: boolean;
  isPublishedToStore?: boolean;
  is_published?: boolean;
  media_updated_at?: string | null;
  mediaUpdatedAt?: string | null;
  store_publish_updated_at?: string | null;
  storePublishUpdatedAt?: string | null;
  mediaCount?: number;
  syncedMediaCount?: number;
  media?: any[];
  unassignedMedia?: any[];
  [key: string]: any;
}

export interface DeltaNewColorGroupInput {
  id?: string;
  name: string;
  colorHex?: string;
  stockQuantity: number;
  colorwayCode?: string;
  template?: string;
  slotA?: string;
  slotB?: string;
}

export interface DeltaMediaAllocationItem {
  id: string;
  mediaId: string;
  url?: string;
  colorGroupId?: string;
  isCommon?: boolean;
  allocationType: 'existing_color' | 'new_color' | 'shared_pool';
  newColorGroup?: DeltaNewColorGroupInput;
  sourcePlatform?: 'instagram' | 'catalog' | 'whatsapp';
  sourceUrl?: string;
  sourcePostId?: string;
  [key: string]: any;
}

export interface DeltaSyncPayload {
  productId: string;
  parentCatalogId?: string;
  mediaAllocations: DeltaMediaAllocationItem[];
  sharedMediaUrls?: string[];
  colorGroupUpdates?: Array<{
    colorGroupId: string;
    stockQuantity?: number;
    mediaOrder?: any[];
  }>;
}

/**
 * Detects if a product has pending store updates.
 * Condition:
 * 1. Product must be published (`isPublished`, `isPublishedToStore`, or `is_published` is true).
 * 2. Newly merged media exists:
 *    - `media_updated_at > store_publish_updated_at`, OR
 *    - `mediaCount > syncedMediaCount`, OR
 *    - `unassignedMedia` has items.
 */
export function hasPendingStoreUpdates(product?: ProductDeltaCheckable | null): boolean {
  if (!product) return false;

  const isPublished = Boolean(
    product.isPublished ?? product.isPublishedToStore ?? product.is_published
  );
  if (!isPublished) return false;

  const mediaUpdatedAtStr = product.media_updated_at || product.mediaUpdatedAt;
  const storePublishUpdatedAtStr = product.store_publish_updated_at || product.storePublishUpdatedAt;

  if (mediaUpdatedAtStr) {
    const mediaTime = new Date(mediaUpdatedAtStr).getTime();
    const publishTime = storePublishUpdatedAtStr ? new Date(storePublishUpdatedAtStr).getTime() : 0;
    if (mediaTime > publishTime) {
      return true;
    }
  }

  const currentCount = product.mediaCount ?? (product.media?.length || 0);
  const syncedCount = product.syncedMediaCount ?? 0;
  if (syncedCount > 0 && currentCount !== syncedCount) {
    return true;
  }

  if (product.unassignedMedia && product.unassignedMedia.length > 0) {
    return true;
  }

  return false;
}

/**
 * Calculates the exact delta count of new/un-synced photos (positive for additions, negative for deletions).
 */
export function getMediaDeltaCount(product?: ProductDeltaCheckable | null): number {
  if (!product) return 0;

  if (product.unassignedMedia && product.unassignedMedia.length > 0) {
    return product.unassignedMedia.length;
  }

  const currentCount = product.mediaCount ?? (product.media?.length || 0);
  const syncedCount = product.syncedMediaCount ?? 0;
  if (syncedCount > 0) {
    const countDelta = currentCount - syncedCount;
    if (countDelta !== 0) return countDelta;
  }

  // Fallback if timestamps indicate delta but count wasn't explicitly tracked
  if (hasPendingStoreUpdates(product)) {
    return 1;
  }

  return 0;
}

/**
 * Formats the visual badge string for pending media deltas.
 * e.g., "+3 new photos", "+1 new photo", "-31 photos"
 */
export function formatMediaDeltaBadge(deltaCount: number): string {
  if (deltaCount === 0) return '';
  if (deltaCount > 0) {
    const label = deltaCount === 1 ? 'photo' : 'photos';
    return `+${deltaCount} new ${label}`;
  }
  const abs = Math.abs(deltaCount);
  const label = abs === 1 ? 'photo' : 'photos';
  return `-${abs} ${label}`;
}

export const calculateMediaDeltaBadge = formatMediaDeltaBadge;

/**
 * Filters a product list into the dedicated "Publish Updates" queue.
 */
export function filterPublishUpdatesQueue<T extends ProductDeltaCheckable>(products: T[]): T[] {
  return products.filter((p) => hasPendingStoreUpdates(p));
}

/**
 * Allocates a media item to an existing color group.
 */
export function allocateMediaToExistingColor<T extends { id: string; url?: string; mediaId?: string }>(
  mediaItem: T,
  colorGroupId: string
): DeltaMediaAllocationItem & T {
  const mediaId = (mediaItem as any).mediaId || mediaItem.id;
  return {
    ...mediaItem,
    id: mediaItem.id || mediaId,
    mediaId,
    colorGroupId,
    isCommon: false,
    allocationType: 'existing_color',
  };
}

/**
 * Validates mandatory initial stock quantity for a new color group.
 * Must be a positive integer > 0.
 */
export function validateNewColorGroupStock(stockQuantity: number): number {
  if (
    stockQuantity === undefined ||
    stockQuantity === null ||
    typeof stockQuantity !== 'number' ||
    isNaN(stockQuantity) ||
    stockQuantity <= 0
  ) {
    throw new Error('Initial stock quantity is mandatory and must be greater than 0');
  }
  return Math.floor(stockQuantity);
}

/**
 * Allocates a media item to a brand new color group, validating mandatory initial stock.
 */
export function allocateMediaToNewColor<T extends { id: string; url?: string; mediaId?: string }>(
  mediaItem: T,
  newGroupConfig: DeltaNewColorGroupInput
): DeltaMediaAllocationItem & T {
  validateNewColorGroupStock(newGroupConfig.stockQuantity);
  const mediaId = (mediaItem as any).mediaId || mediaItem.id;

  return {
    ...mediaItem,
    id: mediaItem.id || mediaId,
    mediaId,
    colorGroupId: newGroupConfig.id,
    isCommon: false,
    allocationType: 'new_color',
    newColorGroup: {
      ...newGroupConfig,
      stockQuantity: Math.floor(newGroupConfig.stockQuantity),
    },
  };
}

/**
 * Allocates a media item to the universal shared group photos pool.
 * Shared photos are stored once in MinIO and common to all variant carousels.
 */
export function allocateMediaToSharedPool<T extends { id: string; url?: string; mediaId?: string }>(
  mediaItem: T
): DeltaMediaAllocationItem & T {
  const mediaId = (mediaItem as any).mediaId || mediaItem.id;
  return {
    ...mediaItem,
    id: mediaItem.id || mediaId,
    mediaId,
    colorGroupId: undefined,
    isCommon: true,
    allocationType: 'shared_pool',
  };
}

/**
 * Assembles and validates a complete batch delta sync payload.
 */
export function buildDeltaSyncPayload(
  productId: string,
  allocations: DeltaMediaAllocationItem[],
  options?: {
    parentCatalogId?: string;
    sharedMediaUrls?: string[];
    colorGroupUpdates?: Array<{
      colorGroupId: string;
      stockQuantity?: number;
      mediaOrder?: any[];
    }>;
  }
): DeltaSyncPayload {
  // Validate any new color group allocations
  for (const alloc of allocations) {
    if (alloc.allocationType === 'new_color' && alloc.newColorGroup) {
      validateNewColorGroupStock(alloc.newColorGroup.stockQuantity);
    }
  }

  const mappedAllocations = allocations.map((alloc) => ({
    ...alloc,
    id: alloc.id || alloc.mediaId,
    mediaId: alloc.mediaId || alloc.id,
  }));

  return {
    productId,
    parentCatalogId: options?.parentCatalogId,
    mediaAllocations: mappedAllocations,
    sharedMediaUrls: options?.sharedMediaUrls,
    colorGroupUpdates: options?.colorGroupUpdates,
  };
}

export interface RawPublishMediaItem {
  id?: string;
  storagePath?: string;
  url?: string;
  [key: string]: any;
}

/**
 * Resolves all media items into valid public or internal thumbnail URLs for publishing to Store.
 * Ensures that all available media items are included and not truncated to the first photo.
 */
export function resolvePublishMediaUrls(
  mediaList?: RawPublishMediaItem[] | null,
  options?: {
    urlResolver?: (m: RawPublishMediaItem) => string | null | undefined;
    fallbackUrl?: string;
  }
): string[] {
  const fallback = options?.fallbackUrl || 'https://picsum.photos/seed/saree/600/800';
  if (!mediaList || mediaList.length === 0) {
    return [fallback];
  }

  const urls: string[] = [];
  for (const m of mediaList) {
    if (options?.urlResolver) {
      const resolved = options.urlResolver(m);
      if (resolved) {
        urls.push(resolved);
        continue;
      }
    }

    if (m.url && !m.url.startsWith('https://via.placeholder.com')) {
      urls.push(m.url);
      continue;
    }

    if (m.id && m.id !== '00000000-0000-0000-0000-000000000000') {
      urls.push(`/api/v1/catalog/media/${m.id}/thumbnail?spec=large`);
      continue;
    }

    if (m.storagePath) {
      urls.push(`/api/v1/catalog/media/thumbnail-by-path?path=${encodeURIComponent(m.storagePath)}&spec=large`);
      continue;
    }
  }

  return urls.length > 0 ? urls : [fallback];
}

/**
 * Determines whether a product requires fetching the full product detail because
 * the preloaded catalog preview list truncated the media items (e.g. catalog limit 15).
 */
export function isFullProductFetchNeededForPublish(
  totalMediaCount?: number,
  preloadedUrisCount?: number
): boolean {
  return (totalMediaCount ?? 0) > (preloadedUrisCount ?? 0);
}

export interface StorePublishItemInput {
  vayyariProductId: string;
  productCode: string;
  title: string;
  categoryName?: string;
  fabric?: string;
  baseCost?: number;
  mediaUrls: string[];
}

/**
 * Constructs a valid Store.Api publish request item, strictly guaranteeing that all resolved
 * media URLs are attached.
 */
export function buildStorePublishItem(
  product: {
    id: string;
    productCode?: string;
    title?: string;
    category?: string;
    fabric?: string;
    vendorPrice?: number | string;
  },
  resolvedMediaUrls: string[] = []
): StorePublishItemInput {
  return {
    vayyariProductId: product.id,
    productCode: product.productCode || 'PROD',
    title: product.title || 'Product',
    categoryName: product.category || 'Saree',
    fabric: product.fabric || 'Silk',
    baseCost: Number(product.vendorPrice) || 8000,
    mediaUrls: resolvedMediaUrls.length > 0
      ? resolvedMediaUrls
      : ['https://picsum.photos/seed/saree/600/800'],
  };
}

